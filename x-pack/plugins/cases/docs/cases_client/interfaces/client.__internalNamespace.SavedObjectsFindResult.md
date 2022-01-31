[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_\_internalNamespace](../modules/client.__internalNamespace.md) / SavedObjectsFindResult

# Interface: SavedObjectsFindResult<T\>

[client](../modules/client.md).[__internalNamespace](../modules/client.__internalNamespace.md).SavedObjectsFindResult

## Type parameters

| Name | Type |
| :------ | :------ |
| `T` | `unknown` |

## Hierarchy

- [`SavedObject`](client.__internalNamespace.SavedObject.md)<`T`\>

  ↳ **`SavedObjectsFindResult`**

## Table of contents

### Properties

- [attributes](client.__internalNamespace.SavedObjectsFindResult.md#attributes)
- [coreMigrationVersion](client.__internalNamespace.SavedObjectsFindResult.md#coremigrationversion)
- [error](client.__internalNamespace.SavedObjectsFindResult.md#error)
- [id](client.__internalNamespace.SavedObjectsFindResult.md#id)
- [migrationVersion](client.__internalNamespace.SavedObjectsFindResult.md#migrationversion)
- [namespaces](client.__internalNamespace.SavedObjectsFindResult.md#namespaces)
- [originId](client.__internalNamespace.SavedObjectsFindResult.md#originid)
- [references](client.__internalNamespace.SavedObjectsFindResult.md#references)
- [score](client.__internalNamespace.SavedObjectsFindResult.md#score)
- [sort](client.__internalNamespace.SavedObjectsFindResult.md#sort)
- [type](client.__internalNamespace.SavedObjectsFindResult.md#type)
- [updated\_at](client.__internalNamespace.SavedObjectsFindResult.md#updated_at)
- [version](client.__internalNamespace.SavedObjectsFindResult.md#version)

## Properties

### attributes

• **attributes**: `T`

{@inheritdoc SavedObjectAttributes}

#### Inherited from

[SavedObject](client.__internalNamespace.SavedObject.md).[attributes](client.__internalNamespace.SavedObject.md#attributes)

#### Defined in

src/core/target/types/types/saved_objects.d.ts:61

___

### coreMigrationVersion

• `Optional` **coreMigrationVersion**: `string`

A semver value that is used when upgrading objects between Kibana versions.

#### Inherited from

[SavedObject](client.__internalNamespace.SavedObject.md).[coreMigrationVersion](client.__internalNamespace.SavedObject.md#coremigrationversion)

#### Defined in

src/core/target/types/types/saved_objects.d.ts:67

___

### error

• `Optional` **error**: [`SavedObjectError`](client.__internalNamespace.SavedObjectError.md)

#### Inherited from

[SavedObject](client.__internalNamespace.SavedObject.md).[error](client.__internalNamespace.SavedObject.md#error)

#### Defined in

src/core/target/types/types/saved_objects.d.ts:59

___

### id

• **id**: `string`

The ID of this Saved Object, guaranteed to be unique for all objects of the same `type`

#### Inherited from

[SavedObject](client.__internalNamespace.SavedObject.md).[id](client.__internalNamespace.SavedObject.md#id)

#### Defined in

src/core/target/types/types/saved_objects.d.ts:52

___

### migrationVersion

• `Optional` **migrationVersion**: [`SavedObjectsMigrationVersion`](client.__internalNamespace.SavedObjectsMigrationVersion.md)

{@inheritdoc SavedObjectsMigrationVersion}

#### Inherited from

[SavedObject](client.__internalNamespace.SavedObject.md).[migrationVersion](client.__internalNamespace.SavedObject.md#migrationversion)

#### Defined in

src/core/target/types/types/saved_objects.d.ts:65

___

### namespaces

• `Optional` **namespaces**: `string`[]

Space(s) that this saved object exists in. This attribute is not used for "global" saved object types which are registered with
`namespaceType: 'agnostic'`.

#### Inherited from

[SavedObject](client.__internalNamespace.SavedObject.md).[namespaces](client.__internalNamespace.SavedObject.md#namespaces)

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

[SavedObject](client.__internalNamespace.SavedObject.md).[originId](client.__internalNamespace.SavedObject.md#originid)

#### Defined in

src/core/target/types/types/saved_objects.d.ts:79

___

### references

• **references**: [`SavedObjectReference`](client.__internalNamespace.SavedObjectReference.md)[]

{@inheritdoc SavedObjectReference}

#### Inherited from

[SavedObject](client.__internalNamespace.SavedObject.md).[references](client.__internalNamespace.SavedObject.md#references)

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
This can be passed directly to the `searchAfter` param in the [SavedObjectsFindOptions](client.__internalNamespace.SavedObjectsFindOptions.md)
in order to page through large numbers of hits. It is recommended you use this alongside
a Point In Time (PIT) that was opened with [SavedObjectsClient.openPointInTimeForType](../classes/client.__internalNamespace.SavedObjectsClient.md#openpointintimefortype).

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

[SavedObject](client.__internalNamespace.SavedObject.md).[type](client.__internalNamespace.SavedObject.md#type)

#### Defined in

src/core/target/types/types/saved_objects.d.ts:54

___

### updated\_at

• `Optional` **updated\_at**: `string`

Timestamp of the last time this document had been updated.

#### Inherited from

[SavedObject](client.__internalNamespace.SavedObject.md).[updated_at](client.__internalNamespace.SavedObject.md#updated_at)

#### Defined in

src/core/target/types/types/saved_objects.d.ts:58

___

### version

• `Optional` **version**: `string`

An opaque version number which changes on each successful write operation. Can be used for implementing optimistic concurrency control.

#### Inherited from

[SavedObject](client.__internalNamespace.SavedObject.md).[version](client.__internalNamespace.SavedObject.md#version)

#### Defined in

src/core/target/types/types/saved_objects.d.ts:56
