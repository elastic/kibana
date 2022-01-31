[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_\_internalNamespace](../modules/client.__internalNamespace.md) / ActionType

# Interface: ActionType<Config, Secrets, Params, ExecutorResultData\>

[client](../modules/client.md).[__internalNamespace](../modules/client.__internalNamespace.md).ActionType

## Type parameters

| Name | Type |
| :------ | :------ |
| `Config` | extends [`ActionTypeConfig`](../modules/client.__internalNamespace.md#actiontypeconfig) = [`ActionTypeConfig`](../modules/client.__internalNamespace.md#actiontypeconfig) |
| `Secrets` | extends [`ActionTypeSecrets`](../modules/client.__internalNamespace.md#actiontypesecrets) = [`ActionTypeSecrets`](../modules/client.__internalNamespace.md#actiontypesecrets) |
| `Params` | extends [`ActionTypeParams`](../modules/client.__internalNamespace.md#actiontypeparams) = [`ActionTypeParams`](../modules/client.__internalNamespace.md#actiontypeparams) |
| `ExecutorResultData` | `void` |

## Table of contents

### Properties

- [executor](client.__internalNamespace.ActionType-1.md#executor)
- [id](client.__internalNamespace.ActionType-1.md#id)
- [maxAttempts](client.__internalNamespace.ActionType-1.md#maxattempts)
- [minimumLicenseRequired](client.__internalNamespace.ActionType-1.md#minimumlicenserequired)
- [name](client.__internalNamespace.ActionType-1.md#name)
- [validate](client.__internalNamespace.ActionType-1.md#validate)

### Methods

- [renderParameterTemplates](client.__internalNamespace.ActionType-1.md#renderparametertemplates)

## Properties

### executor

• **executor**: [`ExecutorType`](../modules/client.__internalNamespace.md#executortype)<`Config`, `Secrets`, `Params`, `ExecutorResultData`\>

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
| `config?` | [`ValidatorType`](client.__internalNamespace.ValidatorType.md)<`Config`\> |
| `params?` | [`ValidatorType`](client.__internalNamespace.ValidatorType.md)<`Params`\> |
| `secrets?` | [`ValidatorType`](client.__internalNamespace.ValidatorType.md)<`Secrets`\> |
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
