# Encrypted Saved Objects

## Overview

The purpose of this plugin is to provide a way to encrypt/decrypt attributes on the custom Saved Objects that works with
security and spaces filtering.

[RFC #2: Encrypted Saved Objects Attributes](../../../rfcs/text/0002_encrypted_attributes.md).

## Usage

Follow these steps to use `encryptedSavedObjects` in your plugin: 

1. Declare `encryptedSavedObjects` as a dependency in `kibana.json`:

```json
{
  ...
  "requiredPlugins": ["encryptedSavedObjects"],
  ...
}
```

2. Add attributes to be encrypted in `mappings.json` file for the respective Saved Object type. These attributes should
always have a `binary` type since they'll contain encrypted content as a `Base64` encoded string and should never be 
searchable or analyzed:

```json
{
 "my-saved-object-type": {
   "properties": {
     "name": { "type": "keyword" },
     "mySecret": { "type": "binary" }
   }
 }
}
```

3. Register Saved Object type using the provided API at the `setup` stage:

```typescript
...
public setup(core: CoreSetup, { encryptedSavedObjects }: PluginSetupDependencies) {
  encryptedSavedObjects.registerType({
    type: 'my-saved-object-type',
    attributesToEncrypt: new Set(['mySecret']),
  });
}
...
```

4. For any Saved Object operation that does not require retrieval of decrypted content, use standard REST or 
programmatic Saved Object API, e.g.:

```typescript
...
router.get(
  { path: '/some-path', validate: false },
  async (context, req, res) => {
    return res.ok({ 
      body: await context.core.savedObjects.client.create(
        'my-saved-object-type',
         { name: 'some name', mySecret: 'non encrypted secret' }
      ),
    });
  }
);
...
```

5. Instantiate an EncryptedSavedObjects client so that you can interact with Saved Objects whose content has been encrypted.

```typescript
const esoClient = encryptedSavedObjects.getClient();
```

If your SavedObject type is a _hidden_ type, then you will have to specify it as an included type:

```typescript
const esoClient = encryptedSavedObjects.getClient({ includedHiddenTypes: ['myHiddenType'] });
```

6. To retrieve Saved Object with decrypted content use the dedicated `getDecryptedAsInternalUser` API method. 

**Note:** As name suggests the method will retrieve the encrypted values and decrypt them on behalf of the internal Kibana
user to make it possible to use this method even when user request context is not available (e.g. in background tasks).
Hence this method should only be used wherever consumers would otherwise feel comfortable using `callAsInternalUser`
and preferably only as a part of the Kibana server routines that are outside of the lifecycle of a HTTP request that a 
user has control over.

```typescript
const savedObjectWithDecryptedContent =  await esoClient.getDecryptedAsInternalUser(
  'my-saved-object-type',
  'saved-object-id'
);
```

`getDecryptedAsInternalUser` also accepts the 3rd optional `options` argument that has exactly the same type as `options`
one would pass to `SavedObjectsClient.get`. These argument allows to specify `namespace` property that, for example, is
required if Saved Object was created within a non-default space.

Alternative option is using `createPointInTimeFinderAsInternalUser` API method, that can be used to help page through large sets of saved objects.
Its interface matches interface of the corresponding Saved Objects API `createPointInTimeFinder` method:

```typescript
const finder = await this.encryptedSavedObjectsClient.createPointInTimeFinderAsInternalUser({
  filter,
  type: 'my-saved-object-type',
  perPage: 1000,
});

for await (const response of finder.find()) {
  // process response
}
```

### Defining migrations
EncryptedSavedObjects rely on standard SavedObject migrations, but due to the additional complexity introduced by the need to decrypt and reencrypt the migrated document, there are some caveats to how we support this.
The good news is, most of this complexity is abstracted away by the plugin and all you need to do is leverage our api.

The `EncryptedSavedObjects` Plugin _SetupContract_ exposes an `createMigration` api which facilitates defining a migration for your EncryptedSavedObject type.

The `createMigration` function takes four arguments:

|Argument|Description|Type|
|---|---|---|
|isMigrationNeededPredicate|A predicate which is called for each document, prior to being decrypted, which confirms whether a document requires migration or not. This predicate is important as the decryption step is costly and we would rather not decrypt and re-encrypt a document if we can avoid it.|function| 
|migration|A migration function which will migrate each decrypted document from the old shape to the new one.|function| 
|shouldMigrateIfDecryptionFails|Optional. A boolean flag which indicates whether to proceed with migration if a document fails to decrypt. If this is not set or if it is set to `false`, decryption errors will be thrown. If set to `true`, a warning will be logged and the migration function will be applied to the original encrypted document. Set this to `true` if you don't want decryption failures to block Kibana upgrades. |boolean| 
|inputType|Optional. An `EncryptedSavedObjectTypeRegistration` which describes the ESOType of the input (the document prior to migration). If this type isn't provided, we'll assume the input doc follows the registered type. |object| 
|migratedType| Optional. An `EncryptedSavedObjectTypeRegistration` which describes the ESOType of the output (the document after migration). If this type isn't provided, we'll assume the migrated doc follows the registered type.|object| 

### Example: Migrating a Value

```typescript
encryptedSavedObjects.registerType({
  type: 'alert',
  attributesToEncrypt: new Set(['apiKey']),
  attributesToExcludeFromAAD: new Set(['mutedInstanceIds', 'updatedBy']),
});

const migration790 = encryptedSavedObjects.createMigration<RawAlert, RawAlert>({
  isMigrationNeededPredicate: function shouldBeMigrated(doc): doc is SavedObjectUnsanitizedDoc<RawAlert> {
    return doc.consumer === 'alerting' || doc.consumer === undefined;
  },
  migration: (doc: SavedObjectUnsanitizedDoc<RawAlert>): SavedObjectUnsanitizedDoc<RawAlert> => {
    const {
      attributes: { consumer },
    } = doc;
    return {
      ...doc,
      attributes: {
        ...doc.attributes,
        consumer: consumer === 'alerting' || !consumer ? 'alerts' : consumer,
      },
    };
  }
});
```

In the above example you can see thwe following:
1. In `shouldBeMigrated` we limit the migrated alerts to those whose `consumer` field equals `alerting` or is undefined.
2. In the migration function we then migrate the value of `consumer` to the value we want (`alerts` or `unknown`, depending on the current value). In this function we can assume that only documents with a `consumer` of `alerting` or `undefined` will be passed in, but it's still safest not to, and so we use the current `consumer` as the default when needed.
3. Note that we haven't passed in any type definitions. This is because we can rely on the registered type, as the migration is changing a value and not the shape of the object.

As we said above, an EncryptedSavedObject migration is a normal SavedObjects migration, and so we can plug it into the underlying SavedObject just like any other kind of migration:

```typescript
savedObjects.registerType({
    name: 'alert',
    hidden: true,
    namespaceType: 'single',
    migrations: {
        // apply this migration in 7.9.0
       '7.9.0': migration790,
    },
    mappings: { 
        //...
    },
});
```

### Example: Migating a Type
If your migration needs to change the type by, for example, removing an encrypted field, you will have to specify the legacy type for the input.

```typescript
encryptedSavedObjects.registerType({
  type: 'alert',
  attributesToEncrypt: new Set(['apiKey']),
  attributesToExcludeFromAAD: new Set(['mutedInstanceIds', 'updatedBy']),
});

const migration790 = encryptedSavedObjects.createMigration<RawAlert, RawAlert>({
  isMigrationNeededPredicate: function shouldBeMigrated(doc): doc is SavedObjectUnsanitizedDoc<RawAlert> {
    return doc.consumer === 'alerting' || doc.consumer === undefined;
  },
  migration: (doc: SavedObjectUnsanitizedDoc<RawAlert>): SavedObjectUnsanitizedDoc<RawAlert> => {
    const {
      attributes: { legacyEncryptedField, ...attributes },
    } = doc;
    return {
      ...doc,
      attributes: {
        ...attributes
      },
    };
  },
  inputType: {
    type: 'alert',
    attributesToEncrypt: new Set(['apiKey', 'legacyEncryptedField']),
    attributesToExcludeFromAAD: new Set(['mutedInstanceIds', 'updatedBy']),
  }
});
```

As you can see in this example we provide a legacy type which describes the _input_ which needs to be decrypted.
The migration function will default to using the registered type to encrypt the migrated document after the migration is applied.

If you need to migrate between two legacy types, you can specify both types at once:

```typescript
encryptedSavedObjects.registerType({
  type: 'alert',
  attributesToEncrypt: new Set(['apiKey']),
  attributesToExcludeFromAAD: new Set(['mutedInstanceIds', 'updatedBy']),
});

const migration780 = encryptedSavedObjects.createMigration<RawAlert, RawAlert>({
  isMigrationNeededPredicate: function shouldBeMigrated(doc): doc is SavedObjectUnsanitizedDoc<RawAlert> {
    // ...
  },
  migration: (doc: SavedObjectUnsanitizedDoc<RawAlert>): SavedObjectUnsanitizedDoc<RawAlert> => {
    // ...
  },
  // legacy input type
  inputType: {
    type: 'alert',
    attributesToEncrypt: new Set(['apiKey', 'legacyEncryptedField']),
    attributesToExcludeFromAAD: new Set(['mutedInstanceIds', 'updatedBy']),
  },
  // legacy migration type
  migratedType: {
    type: 'alert',
    attributesToEncrypt: new Set(['apiKey', 'legacyEncryptedField']),
    attributesToExcludeFromAAD: new Set(['mutedInstanceIds', 'updatedBy', 'legacyEncryptedField']),
  }
});
```

## Testing

### Unit tests

Run Jest tests:

Documentation: https://www.elastic.co/guide/en/kibana/current/development-tests.html#_unit_testing

```
yarn test:jest x-pack/plugins/encrypted_saved_objects --watch
```

### API Integration tests

In one shell, from `kibana-root-folder/x-pack`:
```bash
$ node scripts/functional_tests_server.js --config test/encrypted_saved_objects_api_integration/config.ts
```

In another shell, from `kibana-root-folder/x-pack`:
```bash
$ node ../scripts/functional_test_runner.js --config test/encrypted_saved_objects_api_integration/config.ts --grep="{TEST_NAME}"
```
