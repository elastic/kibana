[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_internal\_namespace](../modules/client._internal_namespace.md) / SavedObjectsUpdateOptions

# Interface: SavedObjectsUpdateOptions<Attributes\>

[client](../modules/client.md).[_internal_namespace](../modules/client._internal_namespace.md).SavedObjectsUpdateOptions

## Type parameters

| Name | Type |
| :------ | :------ |
| `Attributes` | `unknown` |

## Hierarchy

- [`SavedObjectsBaseOptions`](client._internal_namespace.SavedObjectsBaseOptions.md)

  ↳ **`SavedObjectsUpdateOptions`**

## Table of contents

### Properties

- [namespace](client._internal_namespace.SavedObjectsUpdateOptions.md#namespace)
- [references](client._internal_namespace.SavedObjectsUpdateOptions.md#references)
- [refresh](client._internal_namespace.SavedObjectsUpdateOptions.md#refresh)
- [upsert](client._internal_namespace.SavedObjectsUpdateOptions.md#upsert)
- [version](client._internal_namespace.SavedObjectsUpdateOptions.md#version)

## Properties

### namespace

• `Optional` **namespace**: `string`

Specify the namespace for this operation

#### Inherited from

[SavedObjectsBaseOptions](client._internal_namespace.SavedObjectsBaseOptions.md).[namespace](client._internal_namespace.SavedObjectsBaseOptions.md#namespace)

#### Defined in

src/core/target/types/server/saved_objects/types.d.ts:126

___

### references

• `Optional` **references**: [`SavedObjectReference`](client._internal_namespace.SavedObjectReference.md)[]

{@inheritdoc SavedObjectReference}

#### Defined in

src/core/target/types/server/saved_objects/service/saved_objects_client.d.ts:191

___

### refresh

• `Optional` **refresh**: [`MutatingOperationRefreshSetting`](../modules/client._internal_namespace.md#mutatingoperationrefreshsetting)

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
