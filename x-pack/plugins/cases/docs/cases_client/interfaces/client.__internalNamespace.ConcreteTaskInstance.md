[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_\_internalNamespace](../modules/client.__internalNamespace.md) / ConcreteTaskInstance

# Interface: ConcreteTaskInstance

[client](../modules/client.md).[__internalNamespace](../modules/client.__internalNamespace.md).ConcreteTaskInstance

A task instance that has an id and is ready for storage.

## Hierarchy

- [`TaskInstance`](client.__internalNamespace.TaskInstance.md)

  ↳ **`ConcreteTaskInstance`**

## Table of contents

### Properties

- [attempts](client.__internalNamespace.ConcreteTaskInstance.md#attempts)
- [id](client.__internalNamespace.ConcreteTaskInstance.md#id)
- [ownerId](client.__internalNamespace.ConcreteTaskInstance.md#ownerid)
- [params](client.__internalNamespace.ConcreteTaskInstance.md#params)
- [retryAt](client.__internalNamespace.ConcreteTaskInstance.md#retryat)
- [runAt](client.__internalNamespace.ConcreteTaskInstance.md#runat)
- [schedule](client.__internalNamespace.ConcreteTaskInstance.md#schedule)
- [scheduledAt](client.__internalNamespace.ConcreteTaskInstance.md#scheduledat)
- [scope](client.__internalNamespace.ConcreteTaskInstance.md#scope)
- [startedAt](client.__internalNamespace.ConcreteTaskInstance.md#startedat)
- [state](client.__internalNamespace.ConcreteTaskInstance.md#state)
- [status](client.__internalNamespace.ConcreteTaskInstance.md#status)
- [taskType](client.__internalNamespace.ConcreteTaskInstance.md#tasktype)
- [traceparent](client.__internalNamespace.ConcreteTaskInstance.md#traceparent)
- [user](client.__internalNamespace.ConcreteTaskInstance.md#user)
- [version](client.__internalNamespace.ConcreteTaskInstance.md#version)

## Properties

### attempts

• **attempts**: `number`

The number of unsuccessful attempts since the last successful run. This
will be zeroed out after a successful run.

#### Defined in

x-pack/plugins/task_manager/target/types/server/task.d.ts:244

___

### id

• **id**: `string`

The id of the Elastic document that stores this instance's data. This can
be passed by the caller when scheduling the task.

#### Overrides

[TaskInstance](client.__internalNamespace.TaskInstance.md).[id](client.__internalNamespace.TaskInstance.md#id)

#### Defined in

x-pack/plugins/task_manager/target/types/server/task.d.ts:230

___

### ownerId

• **ownerId**: ``null`` \| `string`

The random uuid of the Kibana instance which claimed ownership of the task last

#### Overrides

[TaskInstance](client.__internalNamespace.TaskInstance.md).[ownerId](client.__internalNamespace.TaskInstance.md#ownerid)

#### Defined in

x-pack/plugins/task_manager/target/types/server/task.d.ts:274

___

### params

• **params**: `Record`<`string`, `any`\>

A task-specific set of parameters, used by the task's run function to tailor
its work. This is generally user-input, such as { sms: '333-444-2222' }.

#### Inherited from

[TaskInstance](client.__internalNamespace.TaskInstance.md).[params](client.__internalNamespace.TaskInstance.md#params)

#### Defined in

x-pack/plugins/task_manager/target/types/server/task.d.ts:182

___

### retryAt

• **retryAt**: ``null`` \| `Date`

The date and time that this task should re-execute if stuck in "running" / timeout
status. This value is only set when status is set to "running".

#### Overrides

[TaskInstance](client.__internalNamespace.TaskInstance.md).[retryAt](client.__internalNamespace.TaskInstance.md#retryat)

#### Defined in

x-pack/plugins/task_manager/target/types/server/task.d.ts:264

___

### runAt

• **runAt**: `Date`

The date and time that this task is scheduled to be run. It is not guaranteed
to run at this time, but it is guaranteed not to run earlier than this.

#### Overrides

[TaskInstance](client.__internalNamespace.TaskInstance.md).[runAt](client.__internalNamespace.TaskInstance.md#runat)

#### Defined in

x-pack/plugins/task_manager/target/types/server/task.d.ts:253

___

### schedule

• `Optional` **schedule**: [`IntervalSchedule`](client.__internalNamespace.IntervalSchedule.md)

A TaskSchedule string, which specifies this as a recurring task.

Currently, this supports a single format: an interval in minutes or seconds (e.g. '5m', '30s').

#### Inherited from

[TaskInstance](client.__internalNamespace.TaskInstance.md).[schedule](client.__internalNamespace.TaskInstance.md#schedule)

#### Defined in

x-pack/plugins/task_manager/target/types/server/task.d.ts:177

___

### scheduledAt

• **scheduledAt**: `Date`

The date and time that this task was originally scheduled. This is used
for convenience to task run functions, and for troubleshooting.

#### Overrides

[TaskInstance](client.__internalNamespace.TaskInstance.md).[scheduledAt](client.__internalNamespace.TaskInstance.md#scheduledat)

#### Defined in

x-pack/plugins/task_manager/target/types/server/task.d.ts:239

___

### scope

• `Optional` **scope**: `string`[]

Used to group tasks for querying. So, reporting might schedule tasks with a scope of 'reporting',
and then query such tasks to provide a glimpse at only reporting tasks, rather than at all tasks.

#### Inherited from

[TaskInstance](client.__internalNamespace.TaskInstance.md).[scope](client.__internalNamespace.TaskInstance.md#scope)

#### Defined in

x-pack/plugins/task_manager/target/types/server/task.d.ts:201

___

### startedAt

• **startedAt**: ``null`` \| `Date`

The date and time that this task started execution. This is used to determine
the "real" runAt that ended up running the task. This value is only set
when status is set to "running".

#### Overrides

[TaskInstance](client.__internalNamespace.TaskInstance.md).[startedAt](client.__internalNamespace.TaskInstance.md#startedat)

#### Defined in

x-pack/plugins/task_manager/target/types/server/task.d.ts:259

___

### state

• **state**: `Record`<`string`, `any`\>

The state passed into the task's run function, and returned by the previous
run. If there was no previous run, or if the previous run did not return
any state, this will be the empy object: {}

#### Overrides

[TaskInstance](client.__internalNamespace.TaskInstance.md).[state](client.__internalNamespace.TaskInstance.md#state)

#### Defined in

x-pack/plugins/task_manager/target/types/server/task.d.ts:270

___

### status

• **status**: [`TaskStatus`](../enums/client.__internalNamespace.TaskStatus.md)

Indicates whether or not the task is currently running.

#### Defined in

x-pack/plugins/task_manager/target/types/server/task.d.ts:248

___

### taskType

• **taskType**: `string`

The task definition type whose run function will execute this instance.

#### Inherited from

[TaskInstance](client.__internalNamespace.TaskInstance.md).[taskType](client.__internalNamespace.TaskInstance.md#tasktype)

#### Defined in

x-pack/plugins/task_manager/target/types/server/task.d.ts:149

___

### traceparent

• `Optional` **traceparent**: `string`

The serialized traceparent string of the current APM transaction or span.

#### Inherited from

[TaskInstance](client.__internalNamespace.TaskInstance.md).[traceparent](client.__internalNamespace.TaskInstance.md#traceparent)

#### Defined in

x-pack/plugins/task_manager/target/types/server/task.d.ts:192

___

### user

• `Optional` **user**: `string`

The id of the user who scheduled this task.

#### Inherited from

[TaskInstance](client.__internalNamespace.TaskInstance.md).[user](client.__internalNamespace.TaskInstance.md#user)

#### Defined in

x-pack/plugins/task_manager/target/types/server/task.d.ts:196

___

### version

• `Optional` **version**: `string`

The saved object version from the Elaticsearch document.

#### Defined in

x-pack/plugins/task_manager/target/types/server/task.d.ts:234
