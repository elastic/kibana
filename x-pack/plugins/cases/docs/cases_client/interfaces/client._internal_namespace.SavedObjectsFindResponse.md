[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_internal\_namespace](../modules/client._internal_namespace.md) / SavedObjectsFindResponse

# Interface: SavedObjectsFindResponse<T, A\>

[client](../modules/client.md).[_internal_namespace](../modules/client._internal_namespace.md).SavedObjectsFindResponse

Return type of the Saved Objects `find()` method.

*Note*: this type is different between the Public and Server Saved Objects
clients.

## Type parameters

| Name | Type |
| :------ | :------ |
| `T` | `unknown` |
| `A` | `unknown` |

## Table of contents

### Properties

- [aggregations](client._internal_namespace.SavedObjectsFindResponse.md#aggregations)
- [page](client._internal_namespace.SavedObjectsFindResponse.md#page)
- [per\_page](client._internal_namespace.SavedObjectsFindResponse.md#per_page)
- [pit\_id](client._internal_namespace.SavedObjectsFindResponse.md#pit_id)
- [saved\_objects](client._internal_namespace.SavedObjectsFindResponse.md#saved_objects)
- [total](client._internal_namespace.SavedObjectsFindResponse.md#total)

## Properties

### aggregations

• `Optional` **aggregations**: `A`

#### Defined in

src/core/target/types/server/saved_objects/service/saved_objects_client.d.ts:157

___

### page

• **page**: `number`

#### Defined in

src/core/target/types/server/saved_objects/service/saved_objects_client.d.ts:161

___

### per\_page

• **per\_page**: `number`

#### Defined in

src/core/target/types/server/saved_objects/service/saved_objects_client.d.ts:160

___

### pit\_id

• `Optional` **pit\_id**: `string`

#### Defined in

src/core/target/types/server/saved_objects/service/saved_objects_client.d.ts:162

___

### saved\_objects

• **saved\_objects**: [`SavedObjectsFindResult`](client._internal_namespace.SavedObjectsFindResult.md)<`T`\>[]

#### Defined in

src/core/target/types/server/saved_objects/service/saved_objects_client.d.ts:158

___

### total

• **total**: `number`

#### Defined in

src/core/target/types/server/saved_objects/service/saved_objects_client.d.ts:159
