[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_internal\_namespace](../modules/client._internal_namespace.md) / ActionType

# Interface: ActionType<Config, Secrets, Params, ExecutorResultData\>

[client](../modules/client.md).[_internal_namespace](../modules/client._internal_namespace.md).ActionType

## Type parameters

| Name | Type |
| :------ | :------ |
| `Config` | extends [`ActionTypeConfig`](../modules/client._internal_namespace.md#actiontypeconfig) = [`ActionTypeConfig`](../modules/client._internal_namespace.md#actiontypeconfig) |
| `Secrets` | extends [`ActionTypeSecrets`](../modules/client._internal_namespace.md#actiontypesecrets) = [`ActionTypeSecrets`](../modules/client._internal_namespace.md#actiontypesecrets) |
| `Params` | extends [`ActionTypeParams`](../modules/client._internal_namespace.md#actiontypeparams) = [`ActionTypeParams`](../modules/client._internal_namespace.md#actiontypeparams) |
| `ExecutorResultData` | `void` |

## Table of contents

### Properties

- [executor](client._internal_namespace.ActionType-1.md#executor)
- [id](client._internal_namespace.ActionType-1.md#id)
- [maxAttempts](client._internal_namespace.ActionType-1.md#maxattempts)
- [minimumLicenseRequired](client._internal_namespace.ActionType-1.md#minimumlicenserequired)
- [name](client._internal_namespace.ActionType-1.md#name)
- [validate](client._internal_namespace.ActionType-1.md#validate)

### Methods

- [renderParameterTemplates](client._internal_namespace.ActionType-1.md#renderparametertemplates)

## Properties

### executor

• **executor**: [`ExecutorType`](../modules/client._internal_namespace.md#executortype)<`Config`, `Secrets`, `Params`, `ExecutorResultData`\>

#### Defined in

x-pack/plugins/actions/target/types/server/types.d.ts:82

___

### id

• **id**: `string`

#### Defined in

x-pack/plugins/actions/target/types/server/types.d.ts:71

___

### maxAttempts

• `Optional` **maxAttempts**: `number`

#### Defined in

x-pack/plugins/actions/target/types/server/types.d.ts:73

___

### minimumLicenseRequired

• **minimumLicenseRequired**: ``"basic"`` \| ``"standard"`` \| ``"gold"`` \| ``"platinum"`` \| ``"enterprise"`` \| ``"trial"``

#### Defined in

x-pack/plugins/actions/target/types/server/types.d.ts:74

___

### name

• **name**: `string`

#### Defined in

x-pack/plugins/actions/target/types/server/types.d.ts:72

___

### validate

• `Optional` **validate**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `config?` | [`ValidatorType`](client._internal_namespace.ValidatorType.md)<`Config`\> |
| `params?` | [`ValidatorType`](client._internal_namespace.ValidatorType.md)<`Params`\> |
| `secrets?` | [`ValidatorType`](client._internal_namespace.ValidatorType.md)<`Secrets`\> |
| `connector?` | (`config`: `Config`, `secrets`: `Secrets`) => ``null`` \| `string` |

#### Defined in

x-pack/plugins/actions/target/types/server/types.d.ts:75

## Methods

### renderParameterTemplates

▸ `Optional` **renderParameterTemplates**(`params`, `variables`, `actionId?`): `Params`

#### Parameters

| Name | Type |
| :------ | :------ |
| `params` | `Params` |
| `variables` | `Record`<`string`, `unknown`\> |
| `actionId?` | `string` |

#### Returns

`Params`

#### Defined in

x-pack/plugins/actions/target/types/server/types.d.ts:81
