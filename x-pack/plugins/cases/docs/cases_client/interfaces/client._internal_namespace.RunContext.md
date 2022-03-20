[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_internal\_namespace](../modules/client._internal_namespace.md) / RunContext

# Interface: RunContext

[client](../modules/client.md).[_internal_namespace](../modules/client._internal_namespace.md).RunContext

The run context is passed into a task's run function as its sole argument.

## Table of contents

### Properties

- [taskInstance](client._internal_namespace.RunContext.md#taskinstance)

## Properties

### taskInstance

• **taskInstance**: [`ConcreteTaskInstance`](client._internal_namespace.ConcreteTaskInstance.md)

The document describing the task instance, its params, state, id, etc.

#### Defined in

x-pack/plugins/task_manager/target/types/server/task.d.ts:23
