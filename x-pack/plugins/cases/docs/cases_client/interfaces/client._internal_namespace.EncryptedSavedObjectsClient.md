[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_internal\_namespace](../modules/client._internal_namespace.md) / EncryptedSavedObjectsClient

# Interface: EncryptedSavedObjectsClient

[client](../modules/client.md).[_internal_namespace](../modules/client._internal_namespace.md).EncryptedSavedObjectsClient

## Table of contents

### Methods

- [getDecryptedAsInternalUser](client._internal_namespace.EncryptedSavedObjectsClient.md#getdecryptedasinternaluser)

## Methods

### getDecryptedAsInternalUser

▸ **getDecryptedAsInternalUser**<`T`\>(`type`, `id`, `options?`): `Promise`<[`SavedObject`](client._internal_namespace.SavedObject.md)<`T`\>\>

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | `unknown` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `type` | `string` |
| `id` | `string` |
| `options?` | [`SavedObjectsBaseOptions`](client._internal_namespace.SavedObjectsBaseOptions.md) |

#### Returns

`Promise`<[`SavedObject`](client._internal_namespace.SavedObject.md)<`T`\>\>

#### Defined in

x-pack/plugins/encrypted_saved_objects/target/types/server/saved_objects/index.d.ts:18
