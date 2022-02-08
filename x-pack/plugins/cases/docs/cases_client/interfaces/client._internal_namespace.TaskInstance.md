[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_internal\_namespace](../modules/client._internal_namespace.md) / TaskInstance

# Interface: TaskInstance

[client](../modules/client.md).[_internal_namespace](../modules/client._internal_namespace.md).TaskInstance

## Hierarchy

- **`TaskInstance`**

  ↳ [`ConcreteTaskInstance`](client._internal_namespace.ConcreteTaskInstance.md)

## Table of contents

### Properties

- [id](client._internal_namespace.TaskInstance.md#id)
- [ownerId](client._internal_namespace.TaskInstance.md#ownerid)
- [params](client._internal_namespace.TaskInstance.md#params)
- [retryAt](client._internal_namespace.TaskInstance.md#retryat)
- [runAt](client._internal_namespace.TaskInstance.md#runat)
- [schedule](client._internal_namespace.TaskInstance.md#schedule)
- [scheduledAt](client._internal_namespace.TaskInstance.md#scheduledat)
- [scope](client._internal_namespace.TaskInstance.md#scope)
- [startedAt](client._internal_namespace.TaskInstance.md#startedat)
- [state](client._internal_namespace.TaskInstance.md#state)
- [taskType](client._internal_namespace.TaskInstance.md#tasktype)
- [traceparent](client._internal_namespace.TaskInstance.md#traceparent)
- [user](client._internal_namespace.TaskInstance.md#user)

## Properties

### id

• `Optional` **id**: `string`

Optional ID that can be passed by the caller. When ID is undefined, ES
will auto-generate a unique id. Otherwise, ID will be used to either
create a new document, or update existing document

#### Defined in

x-pack/plugins/task_manager/target/types/server/task.d.ts:145

___

### ownerId

• `Optional` **ownerId**: ``null`` \| `string`

The random uuid of the Kibana instance which claimed ownership of the task last

#### Defined in

x-pack/plugins/task_manager/target/types/server/task.d.ts:205

___

### params

• **params**: `Record`<`string`, `any`\>

A task-specific set of parameters, used by the task's run function to tailor
its work. This is generally user-input, such as { sms: '333-444-2222' }.

#### Defined in

x-pack/plugins/task_manager/target/types/server/task.d.ts:182

___

### retryAt

• `Optional` **retryAt**: ``null`` \| `Date`

The date and time that this task should re-execute if stuck in "running" / timeout
status. This value is only set when status is set to "running".

#### Defined in

x-pack/plugins/task_manager/target/types/server/task.d.ts:165

___

### runAt

• `Optional` **runAt**: `Date`

The date and time that this task is scheduled to be run. It is not
guaranteed to run at this time, but it is guaranteed not to run earlier
than this. Defaults to immediately.

#### Defined in

x-pack/plugins/task_manager/target/types/server/task.d.ts:171

___

### schedule

• `Optional` **schedule**: [`IntervalSchedule`](client._internal_namespace.IntervalSchedule.md)

A TaskSchedule string, which specifies this as a recurring task.

Currently, this supports a single format: an interval in minutes or seconds (e.g. '5m', '30s').

#### Defined in

x-pack/plugins/task_manager/target/types/server/task.d.ts:177

___

### scheduledAt

• `Optional` **scheduledAt**: `Date`

The date and time that this task was originally scheduled. This is used
for convenience to task run functions, and for troubleshooting.

#### Defined in

x-pack/plugins/task_manager/target/types/server/task.d.ts:154

___

### scope

• `Optional` **scope**: `string`[]

Used to group tasks for querying. So, reporting might schedule tasks with a scope of 'reporting',
and then query such tasks to provide a glimpse at only reporting tasks, rather than at all tasks.

#### Defined in

x-pack/plugins/task_manager/target/types/server/task.d.ts:201

___

### startedAt

• `Optional` **startedAt**: ``null`` \| `Date`

The date and time that this task started execution. This is used to determine
the "real" runAt that ended up running the task. This value is only set
when status is set to "running".

#### Defined in

x-pack/plugins/task_manager/target/types/server/task.d.ts:160

___

### state

• **state**: `Record`<`string`, `any`\>

The state passed into the task's run function, and returned by the previous
run. If there was no previous run, or if the previous run did not return
any state, this will be the empy object: {}

#### Defined in

x-pack/plugins/task_manager/target/types/server/task.d.ts:188

___

### taskType

• **taskType**: `string`

The task definition type whose run function will execute this instance.

#### Defined in

x-pack/plugins/task_manager/target/types/server/task.d.ts:149

___

### traceparent

• `Optional` **traceparent**: `string`

The serialized traceparent string of the current APM transaction or span.

#### Defined in

x-pack/plugins/task_manager/target/types/server/task.d.ts:192

___

### user

• `Optional` **user**: `string`

The id of the user who scheduled this task.

#### Defined in

x-pack/plugins/task_manager/target/types/server/task.d.ts:196
