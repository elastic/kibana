[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_internal\_namespace](../modules/client._internal_namespace.md) / SavedObjectsIncrementCounterOptions

# Interface: SavedObjectsIncrementCounterOptions<Attributes\>

[client](../modules/client.md).[_internal_namespace](../modules/client._internal_namespace.md).SavedObjectsIncrementCounterOptions

## Type parameters

| Name | Type |
| :------ | :------ |
| `Attributes` | `unknown` |

## Hierarchy

- [`SavedObjectsBaseOptions`](client._internal_namespace.SavedObjectsBaseOptions.md)

  ↳ **`SavedObjectsIncrementCounterOptions`**

## Table of contents

### Properties

- [initialize](client._internal_namespace.SavedObjectsIncrementCounterOptions.md#initialize)
- [migrationVersion](client._internal_namespace.SavedObjectsIncrementCounterOptions.md#migrationversion)
- [namespace](client._internal_namespace.SavedObjectsIncrementCounterOptions.md#namespace)
- [refresh](client._internal_namespace.SavedObjectsIncrementCounterOptions.md#refresh)
- [upsertAttributes](client._internal_namespace.SavedObjectsIncrementCounterOptions.md#upsertattributes)

## Properties

### initialize

• `Optional` **initialize**: `boolean`

(default=false) If true, sets all the counter fields to 0 if they don't
already exist. Existing fields will be left as-is and won't be incremented.

#### Defined in

src/core/target/types/server/saved_objects/service/lib/repository.d.ts:30

___

### migrationVersion

• `Optional` **migrationVersion**: [`SavedObjectsMigrationVersion`](client._internal_namespace.SavedObjectsMigrationVersion.md)

[SavedObjectsMigrationVersion](client._internal_namespace.SavedObjectsMigrationVersion.md)

#### Defined in

src/core/target/types/server/saved_objects/service/lib/repository.d.ts:32

___

### namespace

• `Optional` **namespace**: `string`

Specify the namespace for this operation

#### Inherited from

[SavedObjectsBaseOptions](client._internal_namespace.SavedObjectsBaseOptions.md).[namespace](client._internal_namespace.SavedObjectsBaseOptions.md#namespace)

#### Defined in

src/core/target/types/server/saved_objects/types.d.ts:126

___

### refresh

• `Optional` **refresh**: [`MutatingOperationRefreshSetting`](../modules/client._internal_namespace.md#mutatingoperationrefreshsetting)

(default='wait_for') The Elasticsearch refresh setting for this
operation. See [MutatingOperationRefreshSetting](../modules/client._internal_namespace.md#mutatingoperationrefreshsetting)

#### Defined in

src/core/target/types/server/saved_objects/service/lib/repository.d.ts:37

___

### upsertAttributes

• `Optional` **upsertAttributes**: `Attributes`

Attributes to use when upserting the document if it doesn't exist.

#### Defined in

src/core/target/types/server/saved_objects/service/lib/repository.d.ts:41
