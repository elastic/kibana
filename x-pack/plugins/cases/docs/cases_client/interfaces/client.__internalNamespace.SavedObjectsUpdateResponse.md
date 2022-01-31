[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_\_internalNamespace](../modules/client.__internalNamespace.md) / SavedObjectsUpdateResponse

# Interface: SavedObjectsUpdateResponse<T\>

[client](../modules/client.md).[__internalNamespace](../modules/client.__internalNamespace.md).SavedObjectsUpdateResponse

## Type parameters

| Name | Type |
| :------ | :------ |
| `T` | `unknown` |

## Hierarchy

- `Omit`<[`SavedObject`](client.__internalNamespace.SavedObject.md)<`T`\>, ``"attributes"`` \| ``"references"``\>

  ↳ **`SavedObjectsUpdateResponse`**

## Table of contents

### Properties

- [attributes](client.__internalNamespace.SavedObjectsUpdateResponse.md#attributes)
- [coreMigrationVersion](client.__internalNamespace.SavedObjectsUpdateResponse.md#coremigrationversion)
- [error](client.__internalNamespace.SavedObjectsUpdateResponse.md#error)
- [id](client.__internalNamespace.SavedObjectsUpdateResponse.md#id)
- [migrationVersion](client.__internalNamespace.SavedObjectsUpdateResponse.md#migrationversion)
- [namespaces](client.__internalNamespace.SavedObjectsUpdateResponse.md#namespaces)
- [originId](client.__internalNamespace.SavedObjectsUpdateResponse.md#originid)
- [references](client.__internalNamespace.SavedObjectsUpdateResponse.md#references)
- [type](client.__internalNamespace.SavedObjectsUpdateResponse.md#type)
- [updated\_at](client.__internalNamespace.SavedObjectsUpdateResponse.md#updated_at)
- [version](client.__internalNamespace.SavedObjectsUpdateResponse.md#version)

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

• `Optional` **error**: [`SavedObjectError`](client.__internalNamespace.SavedObjectError.md)

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

• `Optional` **migrationVersion**: [`SavedObjectsMigrationVersion`](client.__internalNamespace.SavedObjectsMigrationVersion.md)

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

• **references**: `undefined` \| [`SavedObjectReference`](client.__internalNamespace.SavedObjectReference.md)[]

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
