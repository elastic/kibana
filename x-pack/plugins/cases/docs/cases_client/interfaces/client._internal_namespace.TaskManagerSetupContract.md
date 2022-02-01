[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_internal\_namespace](../modules/client._internal_namespace.md) / TaskManagerSetupContract

# Interface: TaskManagerSetupContract

[client](../modules/client.md).[_internal_namespace](../modules/client._internal_namespace.md).TaskManagerSetupContract

## Table of contents

### Properties

- [index](client._internal_namespace.TaskManagerSetupContract.md#index)

### Methods

- [addMiddleware](client._internal_namespace.TaskManagerSetupContract.md#addmiddleware)
- [registerTaskDefinitions](client._internal_namespace.TaskManagerSetupContract.md#registertaskdefinitions)

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
| `middleware` | [`Middleware`](client._internal_namespace.Middleware.md) |

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
| `taskDefinitions` | [`TaskDefinitionRegistry`](../modules/client._internal_namespace.md#taskdefinitionregistry) | The Kibana task definitions dictionary |

#### Returns

`void`

#### Defined in

x-pack/plugins/task_manager/target/types/server/plugin.d.ts:18
