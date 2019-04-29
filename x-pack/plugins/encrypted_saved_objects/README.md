# Encrypted Saved Objects

## Overview

The purpose of this plugin is to provide a way to encrypt/decrypt attributes on the custom Saved Objects that works with
security and spaces filtering as well as performing audit logging.

[RFC #2: Encrypted Saved Objects Attributes](../../../rfcs/text/0002_encrypted_attributes.md).

## Usage

Follow these steps to use `encrypted_saved_objects` in your plugin: 

1. Declare `encrypted_saved_objects` as a dependency:

```typescript
...
new kibana.Plugin({
  ...
  require: ['encrypted_saved_objects'],
  ...
});
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

3. Register Saved Object type using the provided API:

```typescript
server.plugins.encrypted_saved_objects.registerType({
  type: 'my-saved-object-type',
  attributesToEncrypt: new Set(['mySecret']),
});
```

4. For any Saved Object operation that does not require retrieval of decrypted content, use standard REST or 
programmatic Saved Object API, e.g.:

```typescript
...
async handler(request: Request) {
  return await server.savedObjects
    .getScopedSavedObjectsClient(request)
    .create('my-saved-object-type', { name: 'some name', mySecret: 'non encrypted secret' });
}
...
```

5. To retrieve Saved Object with decrypted content use dedicated API:
```typescript
const savedObjectWithDecryptedContent =  await server.plugins.encrypted_saved_objects.getDecryptedAsInternalUser(
  'my-saved-object-type',
  'saved-object-id'
);
```

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

