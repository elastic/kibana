[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_\_internalNamespace](../modules/client.__internalNamespace.md) / EncryptedSavedObjectsClient

# Interface: EncryptedSavedObjectsClient

[client](../modules/client.md).[__internalNamespace](../modules/client.__internalNamespace.md).EncryptedSavedObjectsClient

## Table of contents

### Methods

- [getDecryptedAsInternalUser](client.__internalNamespace.EncryptedSavedObjectsClient.md#getdecryptedasinternaluser)

## Methods

### getDecryptedAsInternalUser

▸ **getDecryptedAsInternalUser**<`T`\>(`type`, `id`, `options?`): `Promise`<[`SavedObject`](client.__internalNamespace.SavedObject.md)<`T`\>\>

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | `unknown` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `type` | `string` |
| `id` | `string` |
| `options?` | [`SavedObjectsBaseOptions`](client.__internalNamespace.SavedObjectsBaseOptions.md) |

#### Returns

`Promise`<[`SavedObject`](client.__internalNamespace.SavedObject.md)<`T`\>\>

#### Defined in

x-pack/plugins/encrypted_saved_objects/target/types/server/saved_objects/index.d.ts:18
