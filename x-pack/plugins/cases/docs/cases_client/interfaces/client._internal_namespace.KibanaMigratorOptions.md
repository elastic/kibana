[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_internal\_namespace](../modules/client._internal_namespace.md) / KibanaMigratorOptions

# Interface: KibanaMigratorOptions

[client](../modules/client.md).[_internal_namespace](../modules/client._internal_namespace.md).KibanaMigratorOptions

## Table of contents

### Properties

- [client](client._internal_namespace.KibanaMigratorOptions.md#client)
- [kibanaIndex](client._internal_namespace.KibanaMigratorOptions.md#kibanaindex)
- [kibanaVersion](client._internal_namespace.KibanaMigratorOptions.md#kibanaversion)
- [logger](client._internal_namespace.KibanaMigratorOptions.md#logger)
- [soMigrationsConfig](client._internal_namespace.KibanaMigratorOptions.md#somigrationsconfig)
- [typeRegistry](client._internal_namespace.KibanaMigratorOptions.md#typeregistry)

## Properties

### client

• **client**: [`ElasticsearchClient`](../modules/client._internal_namespace.md#elasticsearchclient)

#### Defined in

src/core/target/types/server/saved_objects/migrations/kibana_migrator.d.ts:10

___

### kibanaIndex

• **kibanaIndex**: `string`

#### Defined in

src/core/target/types/server/saved_objects/migrations/kibana_migrator.d.ts:13

___

### kibanaVersion

• **kibanaVersion**: `string`

#### Defined in

src/core/target/types/server/saved_objects/migrations/kibana_migrator.d.ts:14

___

### logger

• **logger**: `Logger`

#### Defined in

src/core/target/types/server/saved_objects/migrations/kibana_migrator.d.ts:15

___

### soMigrationsConfig

• **soMigrationsConfig**: `Readonly`<{} & { `batchSize`: `number` ; `maxBatchSizeBytes`: `ByteSizeValue` ; `pollInterval`: `number` ; `retryAttempts`: `number` ; `scrollDuration`: `string` ; `skip`: `boolean`  }\>

#### Defined in

src/core/target/types/server/saved_objects/migrations/kibana_migrator.d.ts:12

___

### typeRegistry

• **typeRegistry**: [`ISavedObjectTypeRegistry`](../modules/client._internal_namespace.md#isavedobjecttyperegistry)

#### Defined in

src/core/target/types/server/saved_objects/migrations/kibana_migrator.d.ts:11
