[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_\_internalNamespace](../modules/client.__internalNamespace.md) / ActionExecutor

# Class: ActionExecutor

[client](../modules/client.md).[__internalNamespace](../modules/client.__internalNamespace.md).ActionExecutor

## Table of contents

### Constructors

- [constructor](client.__internalNamespace.ActionExecutor.md#constructor)

### Properties

- [actionExecutorContext](client.__internalNamespace.ActionExecutor.md#actionexecutorcontext)
- [actionInfo](client.__internalNamespace.ActionExecutor.md#actioninfo)
- [isESOCanEncrypt](client.__internalNamespace.ActionExecutor.md#isesocanencrypt)
- [isInitialized](client.__internalNamespace.ActionExecutor.md#isinitialized)

### Methods

- [execute](client.__internalNamespace.ActionExecutor.md#execute)
- [initialize](client.__internalNamespace.ActionExecutor.md#initialize)
- [logCancellation](client.__internalNamespace.ActionExecutor.md#logcancellation)

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

▸ **execute**(`__namedParameters`): `Promise`<[`ActionTypeExecutorResult`](../interfaces/client.__internalNamespace.ActionTypeExecutorResult.md)<`unknown`\>\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [`ExecuteOptions`](../interfaces/client.__internalNamespace.ExecuteOptions.md)<`unknown`\> |

#### Returns

`Promise`<[`ActionTypeExecutorResult`](../interfaces/client.__internalNamespace.ActionTypeExecutorResult.md)<`unknown`\>\>

#### Defined in

x-pack/plugins/actions/target/types/server/lib/action_executor.d.ts:44

___

### initialize

▸ **initialize**(`actionExecutorContext`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `actionExecutorContext` | [`ActionExecutorContext`](../interfaces/client.__internalNamespace.ActionExecutorContext.md) |

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
| `__namedParameters.request` | [`KibanaRequest`](client.__internalNamespace.KibanaRequest.md)<`unknown`, `unknown`, `unknown`, `any`\> |
| `__namedParameters.source?` | [`ActionExecutionSource`](../interfaces/client.__internalNamespace.ActionExecutionSource.md)<`Source`\> |
| `__namedParameters.taskInfo?` | [`TaskInfo`](../interfaces/client.__internalNamespace.TaskInfo.md) |

#### Returns

`Promise`<`void`\>

#### Defined in

x-pack/plugins/actions/target/types/server/lib/action_executor.d.ts:45
