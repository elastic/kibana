[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_\_internalNamespace](../modules/client.__internalNamespace.md) / SavedObjectsUpdateObjectsSpacesOptions

# Interface: SavedObjectsUpdateObjectsSpacesOptions

[client](../modules/client.md).[__internalNamespace](../modules/client.__internalNamespace.md).SavedObjectsUpdateObjectsSpacesOptions

Options for the update operation.

## Hierarchy

- [`SavedObjectsBaseOptions`](client.__internalNamespace.SavedObjectsBaseOptions.md)

  ↳ **`SavedObjectsUpdateObjectsSpacesOptions`**

## Table of contents

### Properties

- [namespace](client.__internalNamespace.SavedObjectsUpdateObjectsSpacesOptions.md#namespace)
- [refresh](client.__internalNamespace.SavedObjectsUpdateObjectsSpacesOptions.md#refresh)

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

src/core/target/types/server/saved_objects/service/lib/update_objects_spaces.d.ts:37
