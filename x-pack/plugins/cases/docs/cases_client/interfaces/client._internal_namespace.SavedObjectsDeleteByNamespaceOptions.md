[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_internal\_namespace](../modules/client._internal_namespace.md) / SavedObjectsDeleteByNamespaceOptions

# Interface: SavedObjectsDeleteByNamespaceOptions

[client](../modules/client.md).[_internal_namespace](../modules/client._internal_namespace.md).SavedObjectsDeleteByNamespaceOptions

## Hierarchy

- [`SavedObjectsBaseOptions`](client._internal_namespace.SavedObjectsBaseOptions.md)

  ↳ **`SavedObjectsDeleteByNamespaceOptions`**

## Table of contents

### Properties

- [namespace](client._internal_namespace.SavedObjectsDeleteByNamespaceOptions.md#namespace)
- [refresh](client._internal_namespace.SavedObjectsDeleteByNamespaceOptions.md#refresh)

## Properties

### namespace

• `Optional` **namespace**: `string`

Specify the namespace for this operation

#### Inherited from

[SavedObjectsBaseOptions](client._internal_namespace.SavedObjectsBaseOptions.md).[namespace](client._internal_namespace.SavedObjectsBaseOptions.md#namespace)

#### Defined in

src/core/target/types/server/saved_objects/types.d.ts:126

___

### refresh

• `Optional` **refresh**: `boolean`

The Elasticsearch supports only boolean flag for this operation

#### Defined in

src/core/target/types/server/saved_objects/service/lib/repository.d.ts:49
