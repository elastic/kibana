[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_internal\_namespace](../modules/client._internal_namespace.md) / TaskRegisterDefinition

# Interface: TaskRegisterDefinition

[client](../modules/client.md).[_internal_namespace](../modules/client._internal_namespace.md).TaskRegisterDefinition

Defines a task which can be scheduled and run by the Kibana
task manager.

## Table of contents

### Properties

- [createTaskRunner](client._internal_namespace.TaskRegisterDefinition.md#createtaskrunner)
- [description](client._internal_namespace.TaskRegisterDefinition.md#description)
- [maxAttempts](client._internal_namespace.TaskRegisterDefinition.md#maxattempts)
- [maxConcurrency](client._internal_namespace.TaskRegisterDefinition.md#maxconcurrency)
- [timeout](client._internal_namespace.TaskRegisterDefinition.md#timeout)
- [title](client._internal_namespace.TaskRegisterDefinition.md#title)

### Methods

- [getRetry](client._internal_namespace.TaskRegisterDefinition.md#getretry)

## Properties

### createTaskRunner

• **createTaskRunner**: [`TaskRunCreatorFunction`](../modules/client._internal_namespace.md#taskruncreatorfunction)

Creates an object that has a run function which performs the task's work,
and an optional cancel function which cancels the task.

#### Defined in

x-pack/plugins/task_manager/target/types/server/task_type_dictionary.d.ts:35

___

### description

• `Optional` **description**: `string`

An optional more detailed description of what this task does.

#### Defined in

x-pack/plugins/task_manager/target/types/server/task_type_dictionary.d.ts:22

___

### maxAttempts

• `Optional` **maxAttempts**: `number`

Up to how many times the task should retry when it fails to run. This will
default to the global variable. The default value, if not specified, is 1.

#### Defined in

x-pack/plugins/task_manager/target/types/server/task_type_dictionary.d.ts:40

___

### maxConcurrency

• `Optional` **maxConcurrency**: `number`

The maximum number tasks of this type that can be run concurrently per Kibana instance.
Setting this value will force Task Manager to poll for this task type separately from other task types
which can add significant load to the ES cluster, so please use this configuration only when absolutely necessary.
The default value, if not given, is 0.

#### Defined in

x-pack/plugins/task_manager/target/types/server/task_type_dictionary.d.ts:47

___

### timeout

• `Optional` **timeout**: `string`

How long, in minutes or seconds, the system should wait for the task to complete
before it is considered to be timed out. (e.g. '5m', the default). If
the task takes longer than this, Kibana will send it a kill command and
the task will be re-attempted.

#### Defined in

x-pack/plugins/task_manager/target/types/server/task_type_dictionary.d.ts:18

___

### title

• `Optional` **title**: `string`

A brief, human-friendly title for this task.

#### Defined in

x-pack/plugins/task_manager/target/types/server/task_type_dictionary.d.ts:11

## Methods

### getRetry

▸ `Optional` **getRetry**(`attempts`, `error`): `boolean` \| `Date`

Function that customizes how the task should behave when the task fails. This
function can return `true`, `false` or a Date. True will tell task manager
to retry using default delay logic. False will tell task manager to stop retrying
this task. Date will suggest when to the task manager the task should retry.
This function isn't used for recurring tasks, those retry as per their configured recurring schedule.

#### Parameters

| Name | Type |
| :------ | :------ |
| `attempts` | `number` |
| `error` | `object` |

#### Returns

`boolean` \| `Date`

#### Defined in

x-pack/plugins/task_manager/target/types/server/task_type_dictionary.d.ts:30
