[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_\_internalNamespace](../modules/client.__internalNamespace.md) / SavedObject

# Interface: SavedObject<T\>

[client](../modules/client.md).[__internalNamespace](../modules/client.__internalNamespace.md).SavedObject

## Type parameters

| Name | Type |
| :------ | :------ |
| `T` | `unknown` |

## Hierarchy

- **`SavedObject`**

  ↳ [`SavedObjectsFindResult`](client.__internalNamespace.SavedObjectsFindResult.md)

## Table of contents

### Properties

- [attributes](client.__internalNamespace.SavedObject.md#attributes)
- [coreMigrationVersion](client.__internalNamespace.SavedObject.md#coremigrationversion)
- [error](client.__internalNamespace.SavedObject.md#error)
- [id](client.__internalNamespace.SavedObject.md#id)
- [migrationVersion](client.__internalNamespace.SavedObject.md#migrationversion)
- [namespaces](client.__internalNamespace.SavedObject.md#namespaces)
- [originId](client.__internalNamespace.SavedObject.md#originid)
- [references](client.__internalNamespace.SavedObject.md#references)
- [type](client.__internalNamespace.SavedObject.md#type)
- [updated\_at](client.__internalNamespace.SavedObject.md#updated_at)
- [version](client.__internalNamespace.SavedObject.md#version)

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

• `Optional` **error**: [`SavedObjectError`](client.__internalNamespace.SavedObjectError.md)

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

• `Optional` **migrationVersion**: [`SavedObjectsMigrationVersion`](client.__internalNamespace.SavedObjectsMigrationVersion.md)

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

• **references**: [`SavedObjectReference`](client.__internalNamespace.SavedObjectReference.md)[]

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
