[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_internal\_namespace](../modules/client._internal_namespace.md) / ActionExecutor

# Class: ActionExecutor

[client](../modules/client.md).[_internal_namespace](../modules/client._internal_namespace.md).ActionExecutor

## Table of contents

### Constructors

- [constructor](client._internal_namespace.ActionExecutor.md#constructor)

### Properties

- [actionExecutorContext](client._internal_namespace.ActionExecutor.md#actionexecutorcontext)
- [actionInfo](client._internal_namespace.ActionExecutor.md#actioninfo)
- [isESOCanEncrypt](client._internal_namespace.ActionExecutor.md#isesocanencrypt)
- [isInitialized](client._internal_namespace.ActionExecutor.md#isinitialized)

### Methods

- [execute](client._internal_namespace.ActionExecutor.md#execute)
- [initialize](client._internal_namespace.ActionExecutor.md#initialize)
- [logCancellation](client._internal_namespace.ActionExecutor.md#logcancellation)

## Constructors

### constructor

• **new ActionExecutor**(`__namedParameters`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | `Object` |
| `__namedParameters.isESOCanEncrypt` | `boolean` |

#### Defined in

x-pack/plugins/actions/target/types/server/lib/action_executor.d.ts:40

## Properties

### actionExecutorContext

• `Private` `Optional` **actionExecutorContext**: `any`

#### Defined in

x-pack/plugins/actions/target/types/server/lib/action_executor.d.ts:37

___

### actionInfo

• `Private` **actionInfo**: `any`

#### Defined in

x-pack/plugins/actions/target/types/server/lib/action_executor.d.ts:39

___

### isESOCanEncrypt

• `Private` `Readonly` **isESOCanEncrypt**: `any`

#### Defined in

x-pack/plugins/actions/target/types/server/lib/action_executor.d.ts:38

___

### isInitialized

• `Private` **isInitialized**: `any`

#### Defined in

x-pack/plugins/actions/target/types/server/lib/action_executor.d.ts:36

## Methods

### execute

▸ **execute**(`__namedParameters`): `Promise`<[`ActionTypeExecutorResult`](../interfaces/client._internal_namespace.ActionTypeExecutorResult.md)<`unknown`\>\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [`ExecuteOptions`](../interfaces/client._internal_namespace.ExecuteOptions.md)<`unknown`\> |

#### Returns

`Promise`<[`ActionTypeExecutorResult`](../interfaces/client._internal_namespace.ActionTypeExecutorResult.md)<`unknown`\>\>

#### Defined in

x-pack/plugins/actions/target/types/server/lib/action_executor.d.ts:44

___

### initialize

▸ **initialize**(`actionExecutorContext`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `actionExecutorContext` | [`ActionExecutorContext`](../interfaces/client._internal_namespace.ActionExecutorContext.md) |

#### Returns

`void`

#### Defined in

x-pack/plugins/actions/target/types/server/lib/action_executor.d.ts:43

___

### logCancellation

▸ **logCancellation**<`Source`\>(`__namedParameters`): `Promise`<`void`\>

#### Type parameters

| Name | Type |
| :------ | :------ |
| `Source` | `unknown` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | `Object` |
| `__namedParameters.actionId` | `string` |
| `__namedParameters.executionId?` | `string` |
| `__namedParameters.relatedSavedObjects` | `Readonly`<{ `namespace?`: `string` ; `typeId?`: `string`  } & { `id`: `string` ; `type`: `string`  }\>[] |
| `__namedParameters.request` | [`KibanaRequest`](client._internal_namespace.KibanaRequest.md)<`unknown`, `unknown`, `unknown`, `any`\> |
| `__namedParameters.source?` | [`ActionExecutionSource`](../interfaces/client._internal_namespace.ActionExecutionSource.md)<`Source`\> |
| `__namedParameters.taskInfo?` | [`TaskInfo`](../interfaces/client._internal_namespace.TaskInfo.md) |

#### Returns

`Promise`<`void`\>

#### Defined in

x-pack/plugins/actions/target/types/server/lib/action_executor.d.ts:45
