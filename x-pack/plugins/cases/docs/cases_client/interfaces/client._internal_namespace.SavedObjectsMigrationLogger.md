[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_internal\_namespace](../modules/client._internal_namespace.md) / SavedObjectsMigrationLogger

# Interface: SavedObjectsMigrationLogger

[client](../modules/client.md).[_internal_namespace](../modules/client._internal_namespace.md).SavedObjectsMigrationLogger

## Table of contents

### Methods

- [debug](client._internal_namespace.SavedObjectsMigrationLogger.md#debug)
- [error](client._internal_namespace.SavedObjectsMigrationLogger.md#error)
- [info](client._internal_namespace.SavedObjectsMigrationLogger.md#info)
- [warn](client._internal_namespace.SavedObjectsMigrationLogger.md#warn)
- [warning](client._internal_namespace.SavedObjectsMigrationLogger.md#warning)

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
