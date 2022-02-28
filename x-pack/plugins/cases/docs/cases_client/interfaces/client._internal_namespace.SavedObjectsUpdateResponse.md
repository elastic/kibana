[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_internal\_namespace](../modules/client._internal_namespace.md) / SavedObjectsUpdateResponse

# Interface: SavedObjectsUpdateResponse<T\>

[client](../modules/client.md).[_internal_namespace](../modules/client._internal_namespace.md).SavedObjectsUpdateResponse

## Type parameters

| Name | Type |
| :------ | :------ |
| `T` | `unknown` |

## Hierarchy

- `Omit`<[`SavedObject`](client._internal_namespace.SavedObject.md)<`T`\>, ``"attributes"`` \| ``"references"``\>

  ↳ **`SavedObjectsUpdateResponse`**

## Table of contents

### Properties

- [attributes](client._internal_namespace.SavedObjectsUpdateResponse.md#attributes)
- [coreMigrationVersion](client._internal_namespace.SavedObjectsUpdateResponse.md#coremigrationversion)
- [error](client._internal_namespace.SavedObjectsUpdateResponse.md#error)
- [id](client._internal_namespace.SavedObjectsUpdateResponse.md#id)
- [migrationVersion](client._internal_namespace.SavedObjectsUpdateResponse.md#migrationversion)
- [namespaces](client._internal_namespace.SavedObjectsUpdateResponse.md#namespaces)
- [originId](client._internal_namespace.SavedObjectsUpdateResponse.md#originid)
- [references](client._internal_namespace.SavedObjectsUpdateResponse.md#references)
- [type](client._internal_namespace.SavedObjectsUpdateResponse.md#type)
- [updated\_at](client._internal_namespace.SavedObjectsUpdateResponse.md#updated_at)
- [version](client._internal_namespace.SavedObjectsUpdateResponse.md#version)

## Properties

### attributes

• **attributes**: `Partial`<`T`\>

#### Defined in

src/core/target/types/server/saved_objects/service/saved_objects_client.d.ts:271

___

### coreMigrationVersion

• `Optional` **coreMigrationVersion**: `string`

A semver value that is used when upgrading objects between Kibana versions.

#### Inherited from

Omit.coreMigrationVersion

#### Defined in

src/core/target/types/types/saved_objects.d.ts:67

___

### error

• `Optional` **error**: [`SavedObjectError`](client._internal_namespace.SavedObjectError.md)

#### Inherited from

Omit.error

#### Defined in

src/core/target/types/types/saved_objects.d.ts:59

___

### id

• **id**: `string`

The ID of this Saved Object, guaranteed to be unique for all objects of the same `type`

#### Inherited from

Omit.id

#### Defined in

src/core/target/types/types/saved_objects.d.ts:52

___

### migrationVersion

• `Optional` **migrationVersion**: [`SavedObjectsMigrationVersion`](client._internal_namespace.SavedObjectsMigrationVersion.md)

{@inheritdoc SavedObjectsMigrationVersion}

#### Inherited from

Omit.migrationVersion

#### Defined in

src/core/target/types/types/saved_objects.d.ts:65

___

### namespaces

• `Optional` **namespaces**: `string`[]

Space(s) that this saved object exists in. This attribute is not used for "global" saved object types which are registered with
`namespaceType: 'agnostic'`.

#### Inherited from

Omit.namespaces

#### Defined in

src/core/target/types/types/saved_objects.d.ts:72

___

### originId

• `Optional` **originId**: `string`

The ID of the saved object this originated from. This is set if this object's `id` was regenerated; that can happen during migration
from a legacy single-namespace type, or during import. It is only set during migration or create operations. This is used during import
to ensure that ID regeneration is deterministic, so saved objects will be overwritten if they are imported multiple times into a given
space.

#### Inherited from

Omit.originId

#### Defined in

src/core/target/types/types/saved_objects.d.ts:79

___

### references

• **references**: `undefined` \| [`SavedObjectReference`](client._internal_namespace.SavedObjectReference.md)[]

#### Defined in

src/core/target/types/server/saved_objects/service/saved_objects_client.d.ts:272

___

### type

• **type**: `string`

The type of Saved Object. Each plugin can define it's own custom Saved Object types.

#### Inherited from

Omit.type

#### Defined in

src/core/target/types/types/saved_objects.d.ts:54

___

### updated\_at

• `Optional` **updated\_at**: `string`

Timestamp of the last time this document had been updated.

#### Inherited from

Omit.updated\_at

#### Defined in

src/core/target/types/types/saved_objects.d.ts:58

___

### version

• `Optional` **version**: `string`

An opaque version number which changes on each successful write operation. Can be used for implementing optimistic concurrency control.

#### Inherited from

Omit.version

#### Defined in

src/core/target/types/types/saved_objects.d.ts:56
