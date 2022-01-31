[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_\_internalNamespace](../modules/client.__internalNamespace.md) / SavedObjectsIncrementCounterOptions

# Interface: SavedObjectsIncrementCounterOptions<Attributes\>

[client](../modules/client.md).[__internalNamespace](../modules/client.__internalNamespace.md).SavedObjectsIncrementCounterOptions

## Type parameters

| Name | Type |
| :------ | :------ |
| `Attributes` | `unknown` |

## Hierarchy

- [`SavedObjectsBaseOptions`](client.__internalNamespace.SavedObjectsBaseOptions.md)

  ↳ **`SavedObjectsIncrementCounterOptions`**

## Table of contents

### Properties

- [initialize](client.__internalNamespace.SavedObjectsIncrementCounterOptions.md#initialize)
- [migrationVersion](client.__internalNamespace.SavedObjectsIncrementCounterOptions.md#migrationversion)
- [namespace](client.__internalNamespace.SavedObjectsIncrementCounterOptions.md#namespace)
- [refresh](client.__internalNamespace.SavedObjectsIncrementCounterOptions.md#refresh)
- [upsertAttributes](client.__internalNamespace.SavedObjectsIncrementCounterOptions.md#upsertattributes)

## Properties

### initialize

• `Optional` **initialize**: `boolean`

(default=false) If true, sets all the counter fields to 0 if they don't
already exist. Existing fields will be left as-is and won't be incremented.

#### Defined in

src/core/target/types/server/saved_objects/service/lib/repository.d.ts:30

___

### migrationVersion

• `Optional` **migrationVersion**: [`SavedObjectsMigrationVersion`](client.__internalNamespace.SavedObjectsMigrationVersion.md)

[SavedObjectsMigrationVersion](client.__internalNamespace.SavedObjectsMigrationVersion.md)

#### Defined in

src/core/target/types/server/saved_objects/service/lib/repository.d.ts:32

___

### namespace

• `Optional` **namespace**: `string`

Specify the namespace for this operation

#### Inherited from

[SavedObjectsBaseOptions](client.__internalNamespace.SavedObjectsBaseOptions.md).[namespace](client.__internalNamespace.SavedObjectsBaseOptions.md#namespace)

#### Defined in

src/core/target/types/server/saved_objects/types.d.ts:126

___

### refresh

• `Optional` **refresh**: [`MutatingOperationRefreshSetting`](../modules/client.__internalNamespace.md#mutatingoperationrefreshsetting)

(default='wait_for') The Elasticsearch refresh setting for this
operation. See [MutatingOperationRefreshSetting](../modules/client.__internalNamespace.md#mutatingoperationrefreshsetting)

#### Defined in

src/core/target/types/server/saved_objects/service/lib/repository.d.ts:37

___

### upsertAttributes

• `Optional` **upsertAttributes**: `Attributes`

Attributes to use when upserting the document if it doesn't exist.

#### Defined in

src/core/target/types/server/saved_objects/service/lib/repository.d.ts:41
