[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_internal\_namespace](../modules/client._internal_namespace.md) / ActionResult

# Interface: ActionResult<Config\>

[client](../modules/client.md).[_internal_namespace](../modules/client._internal_namespace.md).ActionResult

## Type parameters

| Name | Type |
| :------ | :------ |
| `Config` | extends [`ActionTypeConfig`](../modules/client._internal_namespace.md#actiontypeconfig) = [`ActionTypeConfig`](../modules/client._internal_namespace.md#actiontypeconfig) |

## Hierarchy

- **`ActionResult`**

  ↳ [`FindActionResult`](client._internal_namespace.FindActionResult.md)

  ↳ [`PreConfiguredAction`](client._internal_namespace.PreConfiguredAction.md)

## Table of contents

### Properties

- [actionTypeId](client._internal_namespace.ActionResult.md#actiontypeid)
- [config](client._internal_namespace.ActionResult.md#config)
- [id](client._internal_namespace.ActionResult.md#id)
- [isMissingSecrets](client._internal_namespace.ActionResult.md#ismissingsecrets)
- [isPreconfigured](client._internal_namespace.ActionResult.md#ispreconfigured)
- [name](client._internal_namespace.ActionResult.md#name)

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
