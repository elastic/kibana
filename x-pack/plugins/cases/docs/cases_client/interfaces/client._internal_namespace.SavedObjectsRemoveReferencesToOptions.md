[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_internal\_namespace](../modules/client._internal_namespace.md) / SavedObjectsRemoveReferencesToOptions

# Interface: SavedObjectsRemoveReferencesToOptions

[client](../modules/client.md).[_internal_namespace](../modules/client._internal_namespace.md).SavedObjectsRemoveReferencesToOptions

## Hierarchy

- [`SavedObjectsBaseOptions`](client._internal_namespace.SavedObjectsBaseOptions.md)

  ↳ **`SavedObjectsRemoveReferencesToOptions`**

## Table of contents

### Properties

- [namespace](client._internal_namespace.SavedObjectsRemoveReferencesToOptions.md#namespace)
- [refresh](client._internal_namespace.SavedObjectsRemoveReferencesToOptions.md#refresh)

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

The Elasticsearch Refresh setting for this operation. Defaults to `true`

#### Defined in

src/core/target/types/server/saved_objects/service/saved_objects_client.d.ts:203
