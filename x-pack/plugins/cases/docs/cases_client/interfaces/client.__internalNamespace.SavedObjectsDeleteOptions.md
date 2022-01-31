[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_\_internalNamespace](../modules/client.__internalNamespace.md) / SavedObjectsDeleteOptions

# Interface: SavedObjectsDeleteOptions

[client](../modules/client.md).[__internalNamespace](../modules/client.__internalNamespace.md).SavedObjectsDeleteOptions

## Hierarchy

- [`SavedObjectsBaseOptions`](client.__internalNamespace.SavedObjectsBaseOptions.md)

  ↳ **`SavedObjectsDeleteOptions`**

## Table of contents

### Properties

- [force](client.__internalNamespace.SavedObjectsDeleteOptions.md#force)
- [namespace](client.__internalNamespace.SavedObjectsDeleteOptions.md#namespace)
- [refresh](client.__internalNamespace.SavedObjectsDeleteOptions.md#refresh)

## Properties

### force

• `Optional` **force**: `boolean`

Force deletion of an object that exists in multiple namespaces

#### Defined in

src/core/target/types/server/saved_objects/service/saved_objects_client.d.ts:229

___

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

src/core/target/types/server/saved_objects/service/saved_objects_client.d.ts:227
