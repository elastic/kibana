[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_\_internalNamespace](../modules/client.__internalNamespace.md) / SavedObjectsDeleteByNamespaceOptions

# Interface: SavedObjectsDeleteByNamespaceOptions

[client](../modules/client.md).[__internalNamespace](../modules/client.__internalNamespace.md).SavedObjectsDeleteByNamespaceOptions

## Hierarchy

- [`SavedObjectsBaseOptions`](client.__internalNamespace.SavedObjectsBaseOptions.md)

  ↳ **`SavedObjectsDeleteByNamespaceOptions`**

## Table of contents

### Properties

- [namespace](client.__internalNamespace.SavedObjectsDeleteByNamespaceOptions.md#namespace)
- [refresh](client.__internalNamespace.SavedObjectsDeleteByNamespaceOptions.md#refresh)

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

• `Optional` **refresh**: `boolean`

The Elasticsearch supports only boolean flag for this operation

#### Defined in

src/core/target/types/server/saved_objects/service/lib/repository.d.ts:49
