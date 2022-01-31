[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_\_internalNamespace](../modules/client.__internalNamespace.md) / SavedObjectsMigrationLogger

# Interface: SavedObjectsMigrationLogger

[client](../modules/client.md).[__internalNamespace](../modules/client.__internalNamespace.md).SavedObjectsMigrationLogger

## Table of contents

### Methods

- [debug](client.__internalNamespace.SavedObjectsMigrationLogger.md#debug)
- [error](client.__internalNamespace.SavedObjectsMigrationLogger.md#error)
- [info](client.__internalNamespace.SavedObjectsMigrationLogger.md#info)
- [warn](client.__internalNamespace.SavedObjectsMigrationLogger.md#warn)
- [warning](client.__internalNamespace.SavedObjectsMigrationLogger.md#warning)

## Methods

### debug

▸ **debug**(`msg`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `msg` | `string` |

#### Returns

`void`

#### Defined in

src/core/target/types/server/saved_objects/migrations/core/migration_logger.d.ts:5

___

### error

▸ **error**<`Meta`\>(`msg`, `meta`): `void`

#### Type parameters

| Name | Type |
| :------ | :------ |
| `Meta` | extends `LogMeta` = `LogMeta` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `msg` | `string` |
| `meta` | `Meta` |

#### Returns

`void`

#### Defined in

src/core/target/types/server/saved_objects/migrations/core/migration_logger.d.ts:12

___

### info

▸ **info**(`msg`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `msg` | `string` |

#### Returns

`void`

#### Defined in

src/core/target/types/server/saved_objects/migrations/core/migration_logger.d.ts:6

___

### warn

▸ **warn**(`msg`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `msg` | `string` |

#### Returns

`void`

#### Defined in

src/core/target/types/server/saved_objects/migrations/core/migration_logger.d.ts:11

___

### warning

▸ **warning**(`msg`): `void`

**`deprecated`** Use `warn` instead.

#### Parameters

| Name | Type |
| :------ | :------ |
| `msg` | `string` |

#### Returns

`void`

#### Defined in

src/core/target/types/server/saved_objects/migrations/core/migration_logger.d.ts:10
