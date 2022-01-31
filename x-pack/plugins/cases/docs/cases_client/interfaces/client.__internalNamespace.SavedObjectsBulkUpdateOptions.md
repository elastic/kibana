[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_\_internalNamespace](../modules/client.__internalNamespace.md) / SavedObjectsBulkUpdateOptions

# Interface: SavedObjectsBulkUpdateOptions

[client](../modules/client.md).[__internalNamespace](../modules/client.__internalNamespace.md).SavedObjectsBulkUpdateOptions

## Hierarchy

- [`SavedObjectsBaseOptions`](client.__internalNamespace.SavedObjectsBaseOptions.md)

  ↳ **`SavedObjectsBulkUpdateOptions`**

## Table of contents

### Properties

- [namespace](client.__internalNamespace.SavedObjectsBulkUpdateOptions.md#namespace)
- [refresh](client.__internalNamespace.SavedObjectsBulkUpdateOptions.md#refresh)

## Properties

### namespace

• `Optional` **namespace**: `string`

Specify the namespace for this operation

#### Inherited from

[SavedObjectsBaseOptions](client.__internalNamespace.SavedObjectsBaseOptions.md).[namespace](client.__internalNamespace.SavedObjectsBaseOptions.md#namespace)

#### Defined in

src/core/target/types/server/saved_objects/types.d.ts:126

___

### refresh

• `Optional` **refresh**: [`MutatingOperationRefreshSetting`](../modules/client.__internalNamespace.md#mutatingoperationrefreshsetting)

The Elasticsearch Refresh setting for this operation

#### Defined in

src/core/target/types/server/saved_objects/service/saved_objects_client.d.ts:219
