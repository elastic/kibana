[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_internal\_namespace](../modules/client._internal_namespace.md) / SavedObjectsFindResult

# Interface: SavedObjectsFindResult<T\>

[client](../modules/client.md).[_internal_namespace](../modules/client._internal_namespace.md).SavedObjectsFindResult

## Type parameters

| Name | Type |
| :------ | :------ |
| `T` | `unknown` |

## Hierarchy

- [`SavedObject`](client._internal_namespace.SavedObject.md)<`T`\>

  ↳ **`SavedObjectsFindResult`**

## Table of contents

### Properties

- [attributes](client._internal_namespace.SavedObjectsFindResult.md#attributes)
- [coreMigrationVersion](client._internal_namespace.SavedObjectsFindResult.md#coremigrationversion)
- [error](client._internal_namespace.SavedObjectsFindResult.md#error)
- [id](client._internal_namespace.SavedObjectsFindResult.md#id)
- [migrationVersion](client._internal_namespace.SavedObjectsFindResult.md#migrationversion)
- [namespaces](client._internal_namespace.SavedObjectsFindResult.md#namespaces)
- [originId](client._internal_namespace.SavedObjectsFindResult.md#originid)
- [references](client._internal_namespace.SavedObjectsFindResult.md#references)
- [score](client._internal_namespace.SavedObjectsFindResult.md#score)
- [sort](client._internal_namespace.SavedObjectsFindResult.md#sort)
- [type](client._internal_namespace.SavedObjectsFindResult.md#type)
- [updated\_at](client._internal_namespace.SavedObjectsFindResult.md#updated_at)
- [version](client._internal_namespace.SavedObjectsFindResult.md#version)

## Properties

### attributes

• **attributes**: `T`

{@inheritdoc SavedObjectAttributes}

#### Inherited from

[SavedObject](client._internal_namespace.SavedObject.md).[attributes](client._internal_namespace.SavedObject.md#attributes)

#### Defined in

src/core/target/types/types/saved_objects.d.ts:61

___

### coreMigrationVersion

• `Optional` **coreMigrationVersion**: `string`

A semver value that is used when upgrading objects between Kibana versions.

#### Inherited from

[SavedObject](client._internal_namespace.SavedObject.md).[coreMigrationVersion](client._internal_namespace.SavedObject.md#coremigrationversion)

#### Defined in

src/core/target/types/types/saved_objects.d.ts:67

___

### error

• `Optional` **error**: [`SavedObjectError`](client._internal_namespace.SavedObjectError.md)

#### Inherited from

[SavedObject](client._internal_namespace.SavedObject.md).[error](client._internal_namespace.SavedObject.md#error)

#### Defined in

src/core/target/types/types/saved_objects.d.ts:59

___

### id

• **id**: `string`

The ID of this Saved Object, guaranteed to be unique for all objects of the same `type`

#### Inherited from

[SavedObject](client._internal_namespace.SavedObject.md).[id](client._internal_namespace.SavedObject.md#id)

#### Defined in

src/core/target/types/types/saved_objects.d.ts:52

___

### migrationVersion

• `Optional` **migrationVersion**: [`SavedObjectsMigrationVersion`](client._internal_namespace.SavedObjectsMigrationVersion.md)

{@inheritdoc SavedObjectsMigrationVersion}

#### Inherited from

[SavedObject](client._internal_namespace.SavedObject.md).[migrationVersion](client._internal_namespace.SavedObject.md#migrationversion)

#### Defined in

src/core/target/types/types/saved_objects.d.ts:65

___

### namespaces

• `Optional` **namespaces**: `string`[]

Space(s) that this saved object exists in. This attribute is not used for "global" saved object types which are registered with
`namespaceType: 'agnostic'`.

#### Inherited from

[SavedObject](client._internal_namespace.SavedObject.md).[namespaces](client._internal_namespace.SavedObject.md#namespaces)

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

[SavedObject](client._internal_namespace.SavedObject.md).[originId](client._internal_namespace.SavedObject.md#originid)

#### Defined in

src/core/target/types/types/saved_objects.d.ts:79

___

### references

• **references**: [`SavedObjectReference`](client._internal_namespace.SavedObjectReference.md)[]

{@inheritdoc SavedObjectReference}

#### Inherited from

[SavedObject](client._internal_namespace.SavedObject.md).[references](client._internal_namespace.SavedObject.md#references)

#### Defined in

src/core/target/types/types/saved_objects.d.ts:63

___

### score

• **score**: `number`

The Elasticsearch `_score` of this result.

#### Defined in

src/core/target/types/server/saved_objects/service/saved_objects_client.d.ts:117

___

### sort

• `Optional` **sort**: `string`[]

The Elasticsearch `sort` value of this result.

**`remarks`**
This can be passed directly to the `searchAfter` param in the [SavedObjectsFindOptions](client._internal_namespace.SavedObjectsFindOptions.md)
in order to page through large numbers of hits. It is recommended you use this alongside
a Point In Time (PIT) that was opened with [SavedObjectsClient.openPointInTimeForType](../classes/client._internal_namespace.SavedObjectsClient.md#openpointintimefortype).

**`example`**
```ts
const { id } = await savedObjectsClient.openPointInTimeForType('visualization');
const page1 = await savedObjectsClient.find({
  type: 'visualization',
  sortField: 'updated_at',
  sortOrder: 'asc',
  pit: { id },
});
const lastHit = page1.saved_objects[page1.saved_objects.length - 1];
const page2 = await savedObjectsClient.find({
  type: 'visualization',
  sortField: 'updated_at',
  sortOrder: 'asc',
  pit: { id: page1.pit_id },
  searchAfter: lastHit.sort,
});
await savedObjectsClient.closePointInTime(page2.pit_id);
```

#### Defined in

src/core/target/types/server/saved_objects/service/saved_objects_client.d.ts:146

___

### type

• **type**: `string`

The type of Saved Object. Each plugin can define it's own custom Saved Object types.

#### Inherited from

[SavedObject](client._internal_namespace.SavedObject.md).[type](client._internal_namespace.SavedObject.md#type)

#### Defined in

src/core/target/types/types/saved_objects.d.ts:54

___

### updated\_at

• `Optional` **updated\_at**: `string`

Timestamp of the last time this document had been updated.

#### Inherited from

[SavedObject](client._internal_namespace.SavedObject.md).[updated_at](client._internal_namespace.SavedObject.md#updated_at)

#### Defined in

src/core/target/types/types/saved_objects.d.ts:58

___

### version

• `Optional` **version**: `string`

An opaque version number which changes on each successful write operation. Can be used for implementing optimistic concurrency control.

#### Inherited from

[SavedObject](client._internal_namespace.SavedObject.md).[version](client._internal_namespace.SavedObject.md#version)

#### Defined in

src/core/target/types/types/saved_objects.d.ts:56
