[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_internal\_namespace](../modules/client._internal_namespace.md) / SavedObjectsClosePointInTimeResponse

# Interface: SavedObjectsClosePointInTimeResponse

[client](../modules/client.md).[_internal_namespace](../modules/client._internal_namespace.md).SavedObjectsClosePointInTimeResponse

## Table of contents

### Properties

- [num\_freed](client._internal_namespace.SavedObjectsClosePointInTimeResponse.md#num_freed)
- [succeeded](client._internal_namespace.SavedObjectsClosePointInTimeResponse.md#succeeded)

## Properties

### num\_freed

• **num\_freed**: `number`

The number of search contexts that have been successfully closed.

#### Defined in

src/core/target/types/server/saved_objects/service/saved_objects_client.d.ts:360

___

### succeeded

• **succeeded**: `boolean`

If true, all search contexts associated with the PIT id are
successfully closed.

#### Defined in

src/core/target/types/server/saved_objects/service/saved_objects_client.d.ts:356
