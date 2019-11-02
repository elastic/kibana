# Encrypted Saved Objects

## Overview

The purpose of this plugin is to provide a way to encrypt/decrypt attributes on the custom Saved Objects that works with
security and spaces filtering as well as performing audit logging.

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

5. To retrieve Saved Object with decrypted content use the dedicated `getDecryptedAsInternalUser` API method. 

**Note:** As name suggests the method will retrieve the encrypted values and decrypt them on behalf of the internal Kibana
user to make it possible to use this method even when user request context is not available (e.g. in background tasks).
Hence this method should only be used wherever consumers would otherwise feel comfortable using `callAsInternalUser`
and preferably only as a part of the Kibana server routines that are outside of the lifecycle of a HTTP request that a 
user has control over.

```typescript
const savedObjectWithDecryptedContent =  await encryptedSavedObjects.getDecryptedAsInternalUser(
  'my-saved-object-type',
  'saved-object-id'
);
```

`getDecryptedAsInternalUser` also accepts the 3rd optional `options` argument that has exactly the same type as `options`
one would pass to `SavedObjectsClient.get`. These argument allows to specify `namespace` property that, for example, is
required if Saved Object was created within a non-default space.

## Testing

### Unit tests

From `kibana-root-folder/x-pack`, run:
```bash
$ node scripts/jest.js
```

### API Integration tests

In one shell, from `kibana-root-folder/x-pack`:
```bash
$ node scripts/functional_tests_server.js --config test/plugin_api_integration/config.js
```

In another shell, from `kibana-root-folder/x-pack`:
```bash
$ node ../scripts/functional_test_runner.js --config test/plugin_api_integration/config.js --grep="{TEST_NAME}"
```
