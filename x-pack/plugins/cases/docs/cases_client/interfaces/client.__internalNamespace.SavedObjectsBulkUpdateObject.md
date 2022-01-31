[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_\_internalNamespace](../modules/client.__internalNamespace.md) / SavedObjectsBulkUpdateObject

# Interface: SavedObjectsBulkUpdateObject<T\>

[client](../modules/client.md).[__internalNamespace](../modules/client.__internalNamespace.md).SavedObjectsBulkUpdateObject

## Type parameters

| Name | Type |
| :------ | :------ |
| `T` | `unknown` |

## Hierarchy

- `Pick`<[`SavedObjectsUpdateOptions`](client.__internalNamespace.SavedObjectsUpdateOptions.md)<`T`\>, ``"version"`` \| ``"references"``\>

  ↳ **`SavedObjectsBulkUpdateObject`**

## Table of contents

### Properties

- [attributes](client.__internalNamespace.SavedObjectsBulkUpdateObject.md#attributes)
- [id](client.__internalNamespace.SavedObjectsBulkUpdateObject.md#id)
- [namespace](client.__internalNamespace.SavedObjectsBulkUpdateObject.md#namespace)
- [references](client.__internalNamespace.SavedObjectsBulkUpdateObject.md#references)
- [type](client.__internalNamespace.SavedObjectsBulkUpdateObject.md#type)
- [version](client.__internalNamespace.SavedObjectsBulkUpdateObject.md#version)

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
[SavedObjectsBulkUpdateOptions](client.__internalNamespace.SavedObjectsBulkUpdateOptions.md).

Note: the default namespace's string representation is `'default'`, and its ID representation is `undefined`.

#### Defined in

src/core/target/types/server/saved_objects/service/saved_objects_client.d.ts:100

___

### references

• `Optional` **references**: [`SavedObjectReference`](client.__internalNamespace.SavedObjectReference.md)[]

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
