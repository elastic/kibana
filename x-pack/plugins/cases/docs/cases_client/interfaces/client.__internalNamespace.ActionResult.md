[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_\_internalNamespace](../modules/client.__internalNamespace.md) / ActionResult

# Interface: ActionResult<Config\>

[client](../modules/client.md).[__internalNamespace](../modules/client.__internalNamespace.md).ActionResult

## Type parameters

| Name | Type |
| :------ | :------ |
| `Config` | extends [`ActionTypeConfig`](../modules/client.__internalNamespace.md#actiontypeconfig) = [`ActionTypeConfig`](../modules/client.__internalNamespace.md#actiontypeconfig) |

## Hierarchy

- **`ActionResult`**

  ↳ [`FindActionResult`](client.__internalNamespace.FindActionResult.md)

  ↳ [`PreConfiguredAction`](client.__internalNamespace.PreConfiguredAction.md)

## Table of contents

### Properties

- [actionTypeId](client.__internalNamespace.ActionResult.md#actiontypeid)
- [config](client.__internalNamespace.ActionResult.md#config)
- [id](client.__internalNamespace.ActionResult.md#id)
- [isMissingSecrets](client.__internalNamespace.ActionResult.md#ismissingsecrets)
- [isPreconfigured](client.__internalNamespace.ActionResult.md#ispreconfigured)
- [name](client.__internalNamespace.ActionResult.md#name)

## Properties

### actionTypeId

• **actionTypeId**: `string`

#### Defined in

x-pack/plugins/actions/target/types/server/types.d.ts:50

___

### config

• `Optional` **config**: `Config`

#### Defined in

x-pack/plugins/actions/target/types/server/types.d.ts:53

___

### id

• **id**: `string`

#### Defined in

x-pack/plugins/actions/target/types/server/types.d.ts:49

___

### isMissingSecrets

• `Optional` **isMissingSecrets**: `boolean`

#### Defined in

x-pack/plugins/actions/target/types/server/types.d.ts:52

___

### isPreconfigured

• **isPreconfigured**: `boolean`

#### Defined in

x-pack/plugins/actions/target/types/server/types.d.ts:54

___

### name

• **name**: `string`

#### Defined in

x-pack/plugins/actions/target/types/server/types.d.ts:51
