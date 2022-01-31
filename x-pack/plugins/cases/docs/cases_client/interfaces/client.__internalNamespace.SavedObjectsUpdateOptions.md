[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_\_internalNamespace](../modules/client.__internalNamespace.md) / SavedObjectsUpdateOptions

# Interface: SavedObjectsUpdateOptions<Attributes\>

[client](../modules/client.md).[__internalNamespace](../modules/client.__internalNamespace.md).SavedObjectsUpdateOptions

## Type parameters

| Name | Type |
| :------ | :------ |
| `Attributes` | `unknown` |

## Hierarchy

- [`SavedObjectsBaseOptions`](client.__internalNamespace.SavedObjectsBaseOptions.md)

  ↳ **`SavedObjectsUpdateOptions`**

## Table of contents

### Properties

- [namespace](client.__internalNamespace.SavedObjectsUpdateOptions.md#namespace)
- [references](client.__internalNamespace.SavedObjectsUpdateOptions.md#references)
- [refresh](client.__internalNamespace.SavedObjectsUpdateOptions.md#refresh)
- [upsert](client.__internalNamespace.SavedObjectsUpdateOptions.md#upsert)
- [version](client.__internalNamespace.SavedObjectsUpdateOptions.md#version)

## Properties

### namespace

• `Optional` **namespace**: `string`

Specify the namespace for this operation

#### Inherited from

[SavedObjectsBaseOptions](client.__internalNamespace.SavedObjectsBaseOptions.md).[namespace](client.__internalNamespace.SavedObjectsBaseOptions.md#namespace)

#### Defined in

src/core/target/types/server/saved_objects/types.d.ts:126

___

### references

• `Optional` **references**: [`SavedObjectReference`](client.__internalNamespace.SavedObjectReference.md)[]

{@inheritdoc SavedObjectReference}

#### Defined in

src/core/target/types/server/saved_objects/service/saved_objects_client.d.ts:191

___

### refresh

• `Optional` **refresh**: [`MutatingOperationRefreshSetting`](../modules/client.__internalNamespace.md#mutatingoperationrefreshsetting)

The Elasticsearch Refresh setting for this operation

#### Defined in

src/core/target/types/server/saved_objects/service/saved_objects_client.d.ts:193

___

### upsert

• `Optional` **upsert**: `Attributes`

If specified, will be used to perform an upsert if the document doesn't exist

#### Defined in

src/core/target/types/server/saved_objects/service/saved_objects_client.d.ts:195

___

### version

• `Optional` **version**: `string`

An opaque version number which changes on each successful write operation. Can be used for implementing optimistic concurrency control.

#### Defined in

src/core/target/types/server/saved_objects/service/saved_objects_client.d.ts:189
