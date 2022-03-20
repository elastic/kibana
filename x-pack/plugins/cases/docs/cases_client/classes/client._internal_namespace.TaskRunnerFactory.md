[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_internal\_namespace](../modules/client._internal_namespace.md) / TaskRunnerFactory

# Class: TaskRunnerFactory

[client](../modules/client.md).[_internal_namespace](../modules/client._internal_namespace.md).TaskRunnerFactory

## Table of contents

### Constructors

- [constructor](client._internal_namespace.TaskRunnerFactory.md#constructor)

### Properties

- [actionExecutor](client._internal_namespace.TaskRunnerFactory.md#actionexecutor)
- [isInitialized](client._internal_namespace.TaskRunnerFactory.md#isinitialized)
- [taskRunnerContext](client._internal_namespace.TaskRunnerFactory.md#taskrunnercontext)

### Methods

- [create](client._internal_namespace.TaskRunnerFactory.md#create)
- [initialize](client._internal_namespace.TaskRunnerFactory.md#initialize)

## Constructors

### constructor

• **new TaskRunnerFactory**(`actionExecutor`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `actionExecutor` | [`ActionExecutorContract`](../modules/client._internal_namespace.md#actionexecutorcontract) |

#### Defined in

x-pack/plugins/actions/target/types/server/lib/task_runner_factory.d.ts:18

## Properties

### actionExecutor

• `Private` `Readonly` **actionExecutor**: `any`

#### Defined in

x-pack/plugins/actions/target/types/server/lib/task_runner_factory.d.ts:17

___

### isInitialized

• `Private` **isInitialized**: `any`

#### Defined in

x-pack/plugins/actions/target/types/server/lib/task_runner_factory.d.ts:15

___

### taskRunnerContext

• `Private` `Optional` **taskRunnerContext**: `any`

#### Defined in

x-pack/plugins/actions/target/types/server/lib/task_runner_factory.d.ts:16

## Methods

### create

▸ **create**(`__namedParameters`, `maxAttempts?`): `Object`

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [`RunContext`](../interfaces/client._internal_namespace.RunContext.md) |
| `maxAttempts?` | `number` |

#### Returns

`Object`

| Name | Type |
| :------ | :------ |
| `cancel` | () => `Promise`<{ `state`: {}  }\> |
| `run` | () => `Promise`<`void`\> |

#### Defined in

x-pack/plugins/actions/target/types/server/lib/task_runner_factory.d.ts:20

___

### initialize

▸ **initialize**(`taskRunnerContext`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `taskRunnerContext` | [`TaskRunnerContext`](../interfaces/client._internal_namespace.TaskRunnerContext.md) |

#### Returns

`void`

#### Defined in

x-pack/plugins/actions/target/types/server/lib/task_runner_factory.d.ts:19
