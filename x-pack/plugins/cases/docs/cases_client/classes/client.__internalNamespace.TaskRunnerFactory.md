[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_\_internalNamespace](../modules/client.__internalNamespace.md) / TaskRunnerFactory

# Class: TaskRunnerFactory

[client](../modules/client.md).[__internalNamespace](../modules/client.__internalNamespace.md).TaskRunnerFactory

## Table of contents

### Constructors

- [constructor](client.__internalNamespace.TaskRunnerFactory.md#constructor)

### Properties

- [actionExecutor](client.__internalNamespace.TaskRunnerFactory.md#actionexecutor)
- [isInitialized](client.__internalNamespace.TaskRunnerFactory.md#isinitialized)
- [taskRunnerContext](client.__internalNamespace.TaskRunnerFactory.md#taskrunnercontext)

### Methods

- [create](client.__internalNamespace.TaskRunnerFactory.md#create)
- [initialize](client.__internalNamespace.TaskRunnerFactory.md#initialize)

## Constructors

### constructor

• **new TaskRunnerFactory**(`actionExecutor`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `actionExecutor` | [`ActionExecutorContract`](../modules/client.__internalNamespace.md#actionexecutorcontract) |

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
| `__namedParameters` | [`RunContext`](../interfaces/client.__internalNamespace.RunContext.md) |
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
| `taskRunnerContext` | [`TaskRunnerContext`](../interfaces/client.__internalNamespace.TaskRunnerContext.md) |

#### Returns

`void`

#### Defined in

x-pack/plugins/actions/target/types/server/lib/task_runner_factory.d.ts:19
