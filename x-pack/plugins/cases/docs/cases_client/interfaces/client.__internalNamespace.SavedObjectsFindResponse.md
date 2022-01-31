[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_\_internalNamespace](../modules/client.__internalNamespace.md) / SavedObjectsFindResponse

# Interface: SavedObjectsFindResponse<T, A\>

[client](../modules/client.md).[__internalNamespace](../modules/client.__internalNamespace.md).SavedObjectsFindResponse

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

- [aggregations](client.__internalNamespace.SavedObjectsFindResponse.md#aggregations)
- [page](client.__internalNamespace.SavedObjectsFindResponse.md#page)
- [per\_page](client.__internalNamespace.SavedObjectsFindResponse.md#per_page)
- [pit\_id](client.__internalNamespace.SavedObjectsFindResponse.md#pit_id)
- [saved\_objects](client.__internalNamespace.SavedObjectsFindResponse.md#saved_objects)
- [total](client.__internalNamespace.SavedObjectsFindResponse.md#total)

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

• **saved\_objects**: [`SavedObjectsFindResult`](client.__internalNamespace.SavedObjectsFindResult.md)<`T`\>[]

#### Defined in

src/core/target/types/server/saved_objects/service/saved_objects_client.d.ts:158

___

### total

• **total**: `number`

#### Defined in

src/core/target/types/server/saved_objects/service/saved_objects_client.d.ts:159
