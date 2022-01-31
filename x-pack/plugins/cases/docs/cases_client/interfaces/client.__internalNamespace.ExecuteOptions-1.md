[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_\_internalNamespace](../modules/client.__internalNamespace.md) / ExecuteOptions

# Interface: ExecuteOptions

[client](../modules/client.md).[__internalNamespace](../modules/client.__internalNamespace.md).ExecuteOptions

## Hierarchy

- `Pick`<[`ExecuteOptions`](client.__internalNamespace.ExecuteOptions.md), ``"params"`` \| ``"source"``\>

  ↳ **`ExecuteOptions`**

## Table of contents

### Properties

- [apiKey](client.__internalNamespace.ExecuteOptions-1.md#apikey)
- [executionId](client.__internalNamespace.ExecuteOptions-1.md#executionid)
- [id](client.__internalNamespace.ExecuteOptions-1.md#id)
- [params](client.__internalNamespace.ExecuteOptions-1.md#params)
- [relatedSavedObjects](client.__internalNamespace.ExecuteOptions-1.md#relatedsavedobjects)
- [source](client.__internalNamespace.ExecuteOptions-1.md#source)
- [spaceId](client.__internalNamespace.ExecuteOptions-1.md#spaceid)

## Properties

### apiKey

• **apiKey**: ``null`` \| `string`

#### Defined in

x-pack/plugins/actions/target/types/server/create_execute_function.d.ts:15

___

### executionId

• **executionId**: `string`

#### Defined in

x-pack/plugins/actions/target/types/server/create_execute_function.d.ts:16

___

### id

• **id**: `string`

#### Defined in

x-pack/plugins/actions/target/types/server/create_execute_function.d.ts:13

___

### params

• **params**: `Record`<`string`, `unknown`\>

#### Inherited from

Pick.params

#### Defined in

x-pack/plugins/actions/target/types/server/lib/action_executor.d.ts:28

___

### relatedSavedObjects

• `Optional` **relatedSavedObjects**: `Readonly`<{ `namespace?`: `string` ; `typeId?`: `string`  } & { `id`: `string` ; `type`: `string`  }\>[]

#### Defined in

x-pack/plugins/actions/target/types/server/create_execute_function.d.ts:17

___

### source

• `Optional` **source**: [`ActionExecutionSource`](client.__internalNamespace.ActionExecutionSource.md)<`unknown`\>

#### Inherited from

Pick.source

#### Defined in

x-pack/plugins/actions/target/types/server/lib/action_executor.d.ts:29

___

### spaceId

• **spaceId**: `string`

#### Defined in

x-pack/plugins/actions/target/types/server/create_execute_function.d.ts:14
