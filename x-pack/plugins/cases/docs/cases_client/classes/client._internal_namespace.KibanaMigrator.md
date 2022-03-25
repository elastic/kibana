[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_internal\_namespace](../modules/client._internal_namespace.md) / KibanaMigrator

# Class: KibanaMigrator

[client](../modules/client.md).[_internal_namespace](../modules/client._internal_namespace.md).KibanaMigrator

Manages the shape of mappings and documents in the Kibana index.

## Table of contents

### Constructors

- [constructor](client._internal_namespace.KibanaMigrator.md#constructor)

### Properties

- [activeMappings](client._internal_namespace.KibanaMigrator.md#activemappings)
- [client](client._internal_namespace.KibanaMigrator.md#client)
- [documentMigrator](client._internal_namespace.KibanaMigrator.md#documentmigrator)
- [kibanaIndex](client._internal_namespace.KibanaMigrator.md#kibanaindex)
- [kibanaVersion](client._internal_namespace.KibanaMigrator.md#kibanaversion)
- [log](client._internal_namespace.KibanaMigrator.md#log)
- [mappingProperties](client._internal_namespace.KibanaMigrator.md#mappingproperties)
- [migrationResult](client._internal_namespace.KibanaMigrator.md#migrationresult)
- [runMigrationsInternal](client._internal_namespace.KibanaMigrator.md#runmigrationsinternal)
- [serializer](client._internal_namespace.KibanaMigrator.md#serializer)
- [soMigrationsConfig](client._internal_namespace.KibanaMigrator.md#somigrationsconfig)
- [status$](client._internal_namespace.KibanaMigrator.md#status$)
- [typeRegistry](client._internal_namespace.KibanaMigrator.md#typeregistry)

### Methods

- [getActiveMappings](client._internal_namespace.KibanaMigrator.md#getactivemappings)
- [getStatus$](client._internal_namespace.KibanaMigrator.md#getstatus$)
- [migrateDocument](client._internal_namespace.KibanaMigrator.md#migratedocument)
- [prepareMigrations](client._internal_namespace.KibanaMigrator.md#preparemigrations)
- [runMigrations](client._internal_namespace.KibanaMigrator.md#runmigrations)

## Constructors

### constructor

• **new KibanaMigrator**(`__namedParameters`)

Creates an instance of KibanaMigrator.

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [`KibanaMigratorOptions`](../interfaces/client._internal_namespace.KibanaMigratorOptions.md) |

#### Defined in

src/core/target/types/server/saved_objects/migrations/kibana_migrator.d.ts:42

## Properties

### activeMappings

• `Private` `Readonly` **activeMappings**: `any`

#### Defined in

src/core/target/types/server/saved_objects/migrations/kibana_migrator.d.ts:36

___

### client

• `Private` `Readonly` **client**: `any`

#### Defined in

src/core/target/types/server/saved_objects/migrations/kibana_migrator.d.ts:27

___

### documentMigrator

• `Private` `Readonly` **documentMigrator**: `any`

#### Defined in

src/core/target/types/server/saved_objects/migrations/kibana_migrator.d.ts:28

___

### kibanaIndex

• `Private` `Readonly` **kibanaIndex**: `any`

#### Defined in

src/core/target/types/server/saved_objects/migrations/kibana_migrator.d.ts:29

___

### kibanaVersion

• `Readonly` **kibanaVersion**: `string`

#### Defined in

src/core/target/types/server/saved_objects/migrations/kibana_migrator.d.ts:38

___

### log

• `Private` `Readonly` **log**: `any`

#### Defined in

src/core/target/types/server/saved_objects/migrations/kibana_migrator.d.ts:30

___

### mappingProperties

• `Private` `Readonly` **mappingProperties**: `any`

#### Defined in

src/core/target/types/server/saved_objects/migrations/kibana_migrator.d.ts:31

___

### migrationResult

• `Private` `Optional` **migrationResult**: `any`

#### Defined in

src/core/target/types/server/saved_objects/migrations/kibana_migrator.d.ts:34

___

### runMigrationsInternal

• `Private` **runMigrationsInternal**: `any`

#### Defined in

src/core/target/types/server/saved_objects/migrations/kibana_migrator.d.ts:68

___

### serializer

• `Private` `Readonly` **serializer**: `any`

#### Defined in

src/core/target/types/server/saved_objects/migrations/kibana_migrator.d.ts:33

___

### soMigrationsConfig

• `Private` `Readonly` **soMigrationsConfig**: `any`

#### Defined in

src/core/target/types/server/saved_objects/migrations/kibana_migrator.d.ts:37

___

### status$

• `Private` `Readonly` **status$**: `any`

#### Defined in

src/core/target/types/server/saved_objects/migrations/kibana_migrator.d.ts:35

___

### typeRegistry

• `Private` `Readonly` **typeRegistry**: `any`

#### Defined in

src/core/target/types/server/saved_objects/migrations/kibana_migrator.d.ts:32

## Methods

### getActiveMappings

▸ **getActiveMappings**(): [`IndexMapping`](../interfaces/client._internal_namespace.IndexMapping.md)

Gets all the index mappings defined by Kibana's enabled plugins.

#### Returns

[`IndexMapping`](../interfaces/client._internal_namespace.IndexMapping.md)

#### Defined in

src/core/target/types/server/saved_objects/migrations/kibana_migrator.d.ts:73

___

### getStatus$

▸ **getStatus$**(): `Observable`<[`KibanaMigratorStatus`](../interfaces/client._internal_namespace.KibanaMigratorStatus.md)\>

#### Returns

`Observable`<[`KibanaMigratorStatus`](../interfaces/client._internal_namespace.KibanaMigratorStatus.md)\>

#### Defined in

src/core/target/types/server/saved_objects/migrations/kibana_migrator.d.ts:67

___

### migrateDocument

▸ **migrateDocument**(`doc`): [`SavedObjectUnsanitizedDoc`](../modules/client._internal_namespace.md#savedobjectunsanitizeddoc)<`unknown`\>

Migrates an individual doc to the latest version, as defined by the plugin migrations.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `doc` | [`SavedObjectUnsanitizedDoc`](../modules/client._internal_namespace.md#savedobjectunsanitizeddoc)<`unknown`\> | The saved object to migrate |

#### Returns

[`SavedObjectUnsanitizedDoc`](../modules/client._internal_namespace.md#savedobjectunsanitizeddoc)<`unknown`\>

`doc` with all registered migrations applied.

#### Defined in

src/core/target/types/server/saved_objects/migrations/kibana_migrator.d.ts:80

___

### prepareMigrations

▸ **prepareMigrations**(): `void`

#### Returns

`void`

#### Defined in

src/core/target/types/server/saved_objects/migrations/kibana_migrator.d.ts:66

___

### runMigrations

▸ **runMigrations**(`rerun?`): `Promise`<{ `status`: `string`  }[]\>

Migrates the mappings and documents in the Kibana index. By default, this will run only
once and subsequent calls will return the result of the original call.

**`remarks`** When the `rerun` parameter is set to true, no checks are performed to ensure that no migration
is currently running. Chained or concurrent calls to `runMigrations({ rerun: true })` can lead to
multiple migrations running at the same time. When calling with this parameter, it's expected that the calling
code should ensure that the initial call resolves before calling the function again.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `rerun?` | `Object` | If true, method will run a new migration when called again instead of returning the result of the initial migration. This should only be used when factors external to Kibana itself alter the kibana index causing the saved objects mappings or data to change after the Kibana server performed the initial migration. |
| `rerun.rerun?` | `boolean` | - |

#### Returns

`Promise`<{ `status`: `string`  }[]\>

- A promise which resolves once all migrations have been applied.
   The promise resolves with an array of migration statuses, one for each
   elasticsearch index which was migrated.

#### Defined in

src/core/target/types/server/saved_objects/migrations/kibana_migrator.d.ts:61
