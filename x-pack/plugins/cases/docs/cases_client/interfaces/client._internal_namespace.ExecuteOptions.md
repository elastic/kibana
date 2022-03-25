[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_internal\_namespace](../modules/client._internal_namespace.md) / ExecuteOptions

# Interface: ExecuteOptions<Source\>

[client](../modules/client.md).[_internal_namespace](../modules/client._internal_namespace.md).ExecuteOptions

## Type parameters

| Name | Type |
| :------ | :------ |
| `Source` | `unknown` |

## Table of contents

### Properties

- [actionId](client._internal_namespace.ExecuteOptions.md#actionid)
- [executionId](client._internal_namespace.ExecuteOptions.md#executionid)
- [isEphemeral](client._internal_namespace.ExecuteOptions.md#isephemeral)
- [params](client._internal_namespace.ExecuteOptions.md#params)
- [relatedSavedObjects](client._internal_namespace.ExecuteOptions.md#relatedsavedobjects)
- [request](client._internal_namespace.ExecuteOptions.md#request)
- [source](client._internal_namespace.ExecuteOptions.md#source)
- [taskInfo](client._internal_namespace.ExecuteOptions.md#taskinfo)

## Properties

### actionId

• **actionId**: `string`

#### Defined in

x-pack/plugins/actions/target/types/server/lib/action_executor.d.ts:25

___

### executionId

• `Optional` **executionId**: `string`

#### Defined in

x-pack/plugins/actions/target/types/server/lib/action_executor.d.ts:31

___

### isEphemeral

• `Optional` **isEphemeral**: `boolean`

#### Defined in

x-pack/plugins/actions/target/types/server/lib/action_executor.d.ts:26

___

### params

• **params**: `Record`<`string`, `unknown`\>

#### Defined in

x-pack/plugins/actions/target/types/server/lib/action_executor.d.ts:28

___

### relatedSavedObjects

• `Optional` **relatedSavedObjects**: `Readonly`<{ `namespace?`: `string` ; `typeId?`: `string`  } & { `id`: `string` ; `type`: `string`  }\>[]

#### Defined in

x-pack/plugins/actions/target/types/server/lib/action_executor.d.ts:32

___

### request

• **request**: [`KibanaRequest`](../classes/client._internal_namespace.KibanaRequest.md)<`unknown`, `unknown`, `unknown`, `any`\>

#### Defined in

x-pack/plugins/actions/target/types/server/lib/action_executor.d.ts:27

___

### source

• `Optional` **source**: [`ActionExecutionSource`](client._internal_namespace.ActionExecutionSource.md)<`Source`\>

#### Defined in

x-pack/plugins/actions/target/types/server/lib/action_executor.d.ts:29

___

### taskInfo

• `Optional` **taskInfo**: [`TaskInfo`](client._internal_namespace.TaskInfo.md)

#### Defined in

x-pack/plugins/actions/target/types/server/lib/action_executor.d.ts:30
