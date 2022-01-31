[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_\_internalNamespace](../modules/client.__internalNamespace.md) / TaskManagerSetupContract

# Interface: TaskManagerSetupContract

[client](../modules/client.md).[__internalNamespace](../modules/client.__internalNamespace.md).TaskManagerSetupContract

## Table of contents

### Properties

- [index](client.__internalNamespace.TaskManagerSetupContract.md#index)

### Methods

- [addMiddleware](client.__internalNamespace.TaskManagerSetupContract.md#addmiddleware)
- [registerTaskDefinitions](client.__internalNamespace.TaskManagerSetupContract.md#registertaskdefinitions)

## Properties

### index

• **index**: `string`

**`deprecated`**

#### Defined in

x-pack/plugins/task_manager/target/types/server/plugin.d.ts:12

## Methods

### addMiddleware

▸ **addMiddleware**(`middleware`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `middleware` | [`Middleware`](client.__internalNamespace.Middleware.md) |

#### Returns

`void`

#### Defined in

x-pack/plugins/task_manager/target/types/server/plugin.d.ts:13

___

### registerTaskDefinitions

▸ **registerTaskDefinitions**(`taskDefinitions`): `void`

Method for allowing consumers to register task definitions into the system.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `taskDefinitions` | [`TaskDefinitionRegistry`](../modules/client.__internalNamespace.md#taskdefinitionregistry) | The Kibana task definitions dictionary |

#### Returns

`void`

#### Defined in

x-pack/plugins/task_manager/target/types/server/plugin.d.ts:18
