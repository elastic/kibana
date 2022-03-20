[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_internal\_namespace](../modules/client._internal_namespace.md) / SavedObject

# Interface: SavedObject<T\>

[client](../modules/client.md).[_internal_namespace](../modules/client._internal_namespace.md).SavedObject

## Type parameters

| Name | Type |
| :------ | :------ |
| `T` | `unknown` |

## Hierarchy

- **`SavedObject`**

  ↳ [`SavedObjectsFindResult`](client._internal_namespace.SavedObjectsFindResult.md)

## Table of contents

### Properties

- [attributes](client._internal_namespace.SavedObject.md#attributes)
- [coreMigrationVersion](client._internal_namespace.SavedObject.md#coremigrationversion)
- [error](client._internal_namespace.SavedObject.md#error)
- [id](client._internal_namespace.SavedObject.md#id)
- [migrationVersion](client._internal_namespace.SavedObject.md#migrationversion)
- [namespaces](client._internal_namespace.SavedObject.md#namespaces)
- [originId](client._internal_namespace.SavedObject.md#originid)
- [references](client._internal_namespace.SavedObject.md#references)
- [type](client._internal_namespace.SavedObject.md#type)
- [updated\_at](client._internal_namespace.SavedObject.md#updated_at)
- [version](client._internal_namespace.SavedObject.md#version)

## Properties

### attributes

• **attributes**: `T`

{@inheritdoc SavedObjectAttributes}

#### Defined in

src/core/target/types/types/saved_objects.d.ts:61

___

### coreMigrationVersion

• `Optional` **coreMigrationVersion**: `string`

A semver value that is used when upgrading objects between Kibana versions.

#### Defined in

src/core/target/types/types/saved_objects.d.ts:67

___

### error

• `Optional` **error**: [`SavedObjectError`](client._internal_namespace.SavedObjectError.md)

#### Defined in

src/core/target/types/types/saved_objects.d.ts:59

___

### id

• **id**: `string`

The ID of this Saved Object, guaranteed to be unique for all objects of the same `type`

#### Defined in

src/core/target/types/types/saved_objects.d.ts:52

___

### migrationVersion

• `Optional` **migrationVersion**: [`SavedObjectsMigrationVersion`](client._internal_namespace.SavedObjectsMigrationVersion.md)

{@inheritdoc SavedObjectsMigrationVersion}

#### Defined in

src/core/target/types/types/saved_objects.d.ts:65

___

### namespaces

• `Optional` **namespaces**: `string`[]

Space(s) that this saved object exists in. This attribute is not used for "global" saved object types which are registered with
`namespaceType: 'agnostic'`.

#### Defined in

src/core/target/types/types/saved_objects.d.ts:72

___

### originId

• `Optional` **originId**: `string`

The ID of the saved object this originated from. This is set if this object's `id` was regenerated; that can happen during migration
from a legacy single-namespace type, or during import. It is only set during migration or create operations. This is used during import
to ensure that ID regeneration is deterministic, so saved objects will be overwritten if they are imported multiple times into a given
space.

#### Defined in

src/core/target/types/types/saved_objects.d.ts:79

___

### references

• **references**: [`SavedObjectReference`](client._internal_namespace.SavedObjectReference.md)[]

{@inheritdoc SavedObjectReference}

#### Defined in

src/core/target/types/types/saved_objects.d.ts:63

___

### type

• **type**: `string`

The type of Saved Object. Each plugin can define it's own custom Saved Object types.

#### Defined in

src/core/target/types/types/saved_objects.d.ts:54

___

### updated\_at

• `Optional` **updated\_at**: `string`

Timestamp of the last time this document had been updated.

#### Defined in

src/core/target/types/types/saved_objects.d.ts:58

___

### version

• `Optional` **version**: `string`

An opaque version number which changes on each successful write operation. Can be used for implementing optimistic concurrency control.

#### Defined in

src/core/target/types/types/saved_objects.d.ts:56
