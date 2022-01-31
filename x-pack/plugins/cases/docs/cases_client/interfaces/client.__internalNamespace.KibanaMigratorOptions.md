[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_\_internalNamespace](../modules/client.__internalNamespace.md) / KibanaMigratorOptions

# Interface: KibanaMigratorOptions

[client](../modules/client.md).[__internalNamespace](../modules/client.__internalNamespace.md).KibanaMigratorOptions

## Table of contents

### Properties

- [client](client.__internalNamespace.KibanaMigratorOptions.md#client)
- [kibanaIndex](client.__internalNamespace.KibanaMigratorOptions.md#kibanaindex)
- [kibanaVersion](client.__internalNamespace.KibanaMigratorOptions.md#kibanaversion)
- [logger](client.__internalNamespace.KibanaMigratorOptions.md#logger)
- [soMigrationsConfig](client.__internalNamespace.KibanaMigratorOptions.md#somigrationsconfig)
- [typeRegistry](client.__internalNamespace.KibanaMigratorOptions.md#typeregistry)

## Properties

### client

• **client**: [`ElasticsearchClient`](../modules/client.__internalNamespace.md#elasticsearchclient)

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

• **typeRegistry**: [`ISavedObjectTypeRegistry`](../modules/client.__internalNamespace.md#isavedobjecttyperegistry)

#### Defined in

src/core/target/types/server/saved_objects/migrations/kibana_migrator.d.ts:11
