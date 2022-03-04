[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_internal\_namespace](../modules/client._internal_namespace.md) / SavedObjectsDeleteOptions

# Interface: SavedObjectsDeleteOptions

[client](../modules/client.md).[_internal_namespace](../modules/client._internal_namespace.md).SavedObjectsDeleteOptions

## Hierarchy

- [`SavedObjectsBaseOptions`](client._internal_namespace.SavedObjectsBaseOptions.md)

  ↳ **`SavedObjectsDeleteOptions`**

## Table of contents

### Properties

- [force](client._internal_namespace.SavedObjectsDeleteOptions.md#force)
- [namespace](client._internal_namespace.SavedObjectsDeleteOptions.md#namespace)
- [refresh](client._internal_namespace.SavedObjectsDeleteOptions.md#refresh)

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

[SavedObjectsBaseOptions](client._internal_namespace.SavedObjectsBaseOptions.md).[namespace](client._internal_namespace.SavedObjectsBaseOptions.md#namespace)

#### Defined in

src/core/target/types/server/saved_objects/types.d.ts:126

___

### refresh

• `Optional` **refresh**: [`MutatingOperationRefreshSetting`](../modules/client._internal_namespace.md#mutatingoperationrefreshsetting)

The Elasticsearch Refresh setting for this operation

#### Defined in

src/core/target/types/server/saved_objects/service/saved_objects_client.d.ts:227
