[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_\_internalNamespace](../modules/client.__internalNamespace.md) / PreConfiguredAction

# Interface: PreConfiguredAction<Config, Secrets\>

[client](../modules/client.md).[__internalNamespace](../modules/client.__internalNamespace.md).PreConfiguredAction

## Type parameters

| Name | Type |
| :------ | :------ |
| `Config` | extends [`ActionTypeConfig`](../modules/client.__internalNamespace.md#actiontypeconfig) = [`ActionTypeConfig`](../modules/client.__internalNamespace.md#actiontypeconfig) |
| `Secrets` | extends [`ActionTypeSecrets`](../modules/client.__internalNamespace.md#actiontypesecrets) = [`ActionTypeSecrets`](../modules/client.__internalNamespace.md#actiontypesecrets) |

## Hierarchy

- [`ActionResult`](client.__internalNamespace.ActionResult.md)<`Config`\>

  ↳ **`PreConfiguredAction`**

## Table of contents

### Properties

- [actionTypeId](client.__internalNamespace.PreConfiguredAction.md#actiontypeid)
- [config](client.__internalNamespace.PreConfiguredAction.md#config)
- [id](client.__internalNamespace.PreConfiguredAction.md#id)
- [isMissingSecrets](client.__internalNamespace.PreConfiguredAction.md#ismissingsecrets)
- [isPreconfigured](client.__internalNamespace.PreConfiguredAction.md#ispreconfigured)
- [name](client.__internalNamespace.PreConfiguredAction.md#name)
- [secrets](client.__internalNamespace.PreConfiguredAction.md#secrets)

## Properties

### actionTypeId

• **actionTypeId**: `string`

#### Inherited from

[ActionResult](client.__internalNamespace.ActionResult.md).[actionTypeId](client.__internalNamespace.ActionResult.md#actiontypeid)

#### Defined in

x-pack/plugins/actions/target/types/server/types.d.ts:50

___

### config

• `Optional` **config**: `Config`

#### Inherited from

[ActionResult](client.__internalNamespace.ActionResult.md).[config](client.__internalNamespace.ActionResult.md#config)

#### Defined in

x-pack/plugins/actions/target/types/server/types.d.ts:53

___

### id

• **id**: `string`

#### Inherited from

[ActionResult](client.__internalNamespace.ActionResult.md).[id](client.__internalNamespace.ActionResult.md#id)

#### Defined in

x-pack/plugins/actions/target/types/server/types.d.ts:49

___

### isMissingSecrets

• `Optional` **isMissingSecrets**: `boolean`

#### Inherited from

[ActionResult](client.__internalNamespace.ActionResult.md).[isMissingSecrets](client.__internalNamespace.ActionResult.md#ismissingsecrets)

#### Defined in

x-pack/plugins/actions/target/types/server/types.d.ts:52

___

### isPreconfigured

• **isPreconfigured**: `boolean`

#### Inherited from

[ActionResult](client.__internalNamespace.ActionResult.md).[isPreconfigured](client.__internalNamespace.ActionResult.md#ispreconfigured)

#### Defined in

x-pack/plugins/actions/target/types/server/types.d.ts:54

___

### name

• **name**: `string`

#### Inherited from

[ActionResult](client.__internalNamespace.ActionResult.md).[name](client.__internalNamespace.ActionResult.md#name)

#### Defined in

x-pack/plugins/actions/target/types/server/types.d.ts:51

___

### secrets

• **secrets**: `Secrets`

#### Defined in

x-pack/plugins/actions/target/types/server/types.d.ts:57
