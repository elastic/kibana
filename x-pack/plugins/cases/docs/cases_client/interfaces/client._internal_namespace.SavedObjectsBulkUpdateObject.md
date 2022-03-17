[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_internal\_namespace](../modules/client._internal_namespace.md) / SavedObjectsBulkUpdateObject

# Interface: SavedObjectsBulkUpdateObject<T\>

[client](../modules/client.md).[_internal_namespace](../modules/client._internal_namespace.md).SavedObjectsBulkUpdateObject

## Type parameters

| Name | Type |
| :------ | :------ |
| `T` | `unknown` |

## Hierarchy

- `Pick`<[`SavedObjectsUpdateOptions`](client._internal_namespace.SavedObjectsUpdateOptions.md)<`T`\>, ``"version"`` \| ``"references"``\>

  ↳ **`SavedObjectsBulkUpdateObject`**

## Table of contents

### Properties

- [attributes](client._internal_namespace.SavedObjectsBulkUpdateObject.md#attributes)
- [id](client._internal_namespace.SavedObjectsBulkUpdateObject.md#id)
- [namespace](client._internal_namespace.SavedObjectsBulkUpdateObject.md#namespace)
- [references](client._internal_namespace.SavedObjectsBulkUpdateObject.md#references)
- [type](client._internal_namespace.SavedObjectsBulkUpdateObject.md#type)
- [version](client._internal_namespace.SavedObjectsBulkUpdateObject.md#version)

## Properties

### attributes

• **attributes**: `Partial`<`T`\>

{@inheritdoc SavedObjectAttributes}

#### Defined in

src/core/target/types/server/saved_objects/service/saved_objects_client.d.ts:93

___

### id

• **id**: `string`

The ID of this Saved Object, guaranteed to be unique for all objects of the same `type`

#### Defined in

src/core/target/types/server/saved_objects/service/saved_objects_client.d.ts:89

___

### namespace

• `Optional` **namespace**: `string`

Optional namespace string to use when searching for this object. If this is defined, it will supersede the namespace ID that is in
[SavedObjectsBulkUpdateOptions](client._internal_namespace.SavedObjectsBulkUpdateOptions.md).

Note: the default namespace's string representation is `'default'`, and its ID representation is `undefined`.

#### Defined in

src/core/target/types/server/saved_objects/service/saved_objects_client.d.ts:100

___

### references

• `Optional` **references**: [`SavedObjectReference`](client._internal_namespace.SavedObjectReference.md)[]

{@inheritdoc SavedObjectReference}

#### Inherited from

Pick.references

#### Defined in

src/core/target/types/server/saved_objects/service/saved_objects_client.d.ts:191

___

### type

• **type**: `string`

The type of this Saved Object. Each plugin can define it's own custom Saved Object types.

#### Defined in

src/core/target/types/server/saved_objects/service/saved_objects_client.d.ts:91

___

### version

• `Optional` **version**: `string`

An opaque version number which changes on each successful write operation. Can be used for implementing optimistic concurrency control.

#### Inherited from

Pick.version

#### Defined in

src/core/target/types/server/saved_objects/service/saved_objects_client.d.ts:189
