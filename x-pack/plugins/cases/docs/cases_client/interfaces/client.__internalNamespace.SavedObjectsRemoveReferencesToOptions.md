[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_\_internalNamespace](../modules/client.__internalNamespace.md) / SavedObjectsRemoveReferencesToOptions

# Interface: SavedObjectsRemoveReferencesToOptions

[client](../modules/client.md).[__internalNamespace](../modules/client.__internalNamespace.md).SavedObjectsRemoveReferencesToOptions

## Hierarchy

- [`SavedObjectsBaseOptions`](client.__internalNamespace.SavedObjectsBaseOptions.md)

  ↳ **`SavedObjectsRemoveReferencesToOptions`**

## Table of contents

### Properties

- [namespace](client.__internalNamespace.SavedObjectsRemoveReferencesToOptions.md#namespace)
- [refresh](client.__internalNamespace.SavedObjectsRemoveReferencesToOptions.md#refresh)

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

The Elasticsearch Refresh setting for this operation. Defaults to `true`

#### Defined in

src/core/target/types/server/saved_objects/service/saved_objects_client.d.ts:203
