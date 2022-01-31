[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_\_internalNamespace](../modules/client.__internalNamespace.md) / ActionTypeRegistry

# Class: ActionTypeRegistry

[client](../modules/client.md).[__internalNamespace](../modules/client.__internalNamespace.md).ActionTypeRegistry

## Table of contents

### Constructors

- [constructor](client.__internalNamespace.ActionTypeRegistry.md#constructor)

### Properties

- [actionTypes](client.__internalNamespace.ActionTypeRegistry.md#actiontypes)
- [actionsConfigUtils](client.__internalNamespace.ActionTypeRegistry.md#actionsconfigutils)
- [licenseState](client.__internalNamespace.ActionTypeRegistry.md#licensestate)
- [licensing](client.__internalNamespace.ActionTypeRegistry.md#licensing)
- [preconfiguredActions](client.__internalNamespace.ActionTypeRegistry.md#preconfiguredactions)
- [taskManager](client.__internalNamespace.ActionTypeRegistry.md#taskmanager)
- [taskRunnerFactory](client.__internalNamespace.ActionTypeRegistry.md#taskrunnerfactory)

### Methods

- [ensureActionTypeEnabled](client.__internalNamespace.ActionTypeRegistry.md#ensureactiontypeenabled)
- [get](client.__internalNamespace.ActionTypeRegistry.md#get)
- [has](client.__internalNamespace.ActionTypeRegistry.md#has)
- [isActionExecutable](client.__internalNamespace.ActionTypeRegistry.md#isactionexecutable)
- [isActionTypeEnabled](client.__internalNamespace.ActionTypeRegistry.md#isactiontypeenabled)
- [list](client.__internalNamespace.ActionTypeRegistry.md#list)
- [register](client.__internalNamespace.ActionTypeRegistry.md#register)

## Constructors

### constructor

• **new ActionTypeRegistry**(`constructorParams`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `constructorParams` | [`ActionTypeRegistryOpts`](../interfaces/client.__internalNamespace.ActionTypeRegistryOpts.md) |

#### Defined in

x-pack/plugins/actions/target/types/server/action_type_registry.d.ts:23

## Properties

### actionTypes

• `Private` `Readonly` **actionTypes**: `any`

#### Defined in

x-pack/plugins/actions/target/types/server/action_type_registry.d.ts:17

___

### actionsConfigUtils

• `Private` `Readonly` **actionsConfigUtils**: `any`

#### Defined in

x-pack/plugins/actions/target/types/server/action_type_registry.d.ts:19

___

### licenseState

• `Private` `Readonly` **licenseState**: `any`

#### Defined in

x-pack/plugins/actions/target/types/server/action_type_registry.d.ts:20

___

### licensing

• `Private` `Readonly` **licensing**: `any`

#### Defined in

x-pack/plugins/actions/target/types/server/action_type_registry.d.ts:22

___

### preconfiguredActions

• `Private` `Readonly` **preconfiguredActions**: `any`

#### Defined in

x-pack/plugins/actions/target/types/server/action_type_registry.d.ts:21

___

### taskManager

• `Private` `Readonly` **taskManager**: `any`

#### Defined in

x-pack/plugins/actions/target/types/server/action_type_registry.d.ts:16

___

### taskRunnerFactory

• `Private` `Readonly` **taskRunnerFactory**: `any`

#### Defined in

x-pack/plugins/actions/target/types/server/action_type_registry.d.ts:18

## Methods

### ensureActionTypeEnabled

▸ **ensureActionTypeEnabled**(`id`): `void`

Throws error if action type is not enabled.

#### Parameters

| Name | Type |
| :------ | :------ |
| `id` | `string` |

#### Returns

`void`

#### Defined in

x-pack/plugins/actions/target/types/server/action_type_registry.d.ts:31

___

### get

▸ **get**<`Config`, `Secrets`, `Params`, `ExecutorResultData`\>(`id`): [`ActionType`](../interfaces/client.__internalNamespace.ActionType-1.md)<`Config`, `Secrets`, `Params`, `ExecutorResultData`\>

Returns an action type, throws if not registered

#### Type parameters

| Name | Type |
| :------ | :------ |
| `Config` | extends [`ActionTypeConfig`](../modules/client.__internalNamespace.md#actiontypeconfig) = [`ActionTypeConfig`](../modules/client.__internalNamespace.md#actiontypeconfig) |
| `Secrets` | extends [`ActionTypeSecrets`](../modules/client.__internalNamespace.md#actiontypesecrets) = [`ActionTypeSecrets`](../modules/client.__internalNamespace.md#actiontypesecrets) |
| `Params` | extends [`ActionTypeParams`](../modules/client.__internalNamespace.md#actiontypeparams) = [`ActionTypeParams`](../modules/client.__internalNamespace.md#actiontypeparams) |
| `ExecutorResultData` | `void` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `id` | `string` |

#### Returns

[`ActionType`](../interfaces/client.__internalNamespace.ActionType-1.md)<`Config`, `Secrets`, `Params`, `ExecutorResultData`\>

#### Defined in

x-pack/plugins/actions/target/types/server/action_type_registry.d.ts:51

___

### has

▸ **has**(`id`): `boolean`

Returns if the action type registry has the given action type registered

#### Parameters

| Name | Type |
| :------ | :------ |
| `id` | `string` |

#### Returns

`boolean`

#### Defined in

x-pack/plugins/actions/target/types/server/action_type_registry.d.ts:27

___

### isActionExecutable

▸ **isActionExecutable**(`actionId`, `actionTypeId`, `options?`): `boolean`

Returns true if action type is enabled or it is a preconfigured action type.

#### Parameters

| Name | Type |
| :------ | :------ |
| `actionId` | `string` |
| `actionTypeId` | `string` |
| `options?` | `Object` |
| `options.notifyUsage` | `boolean` |

#### Returns

`boolean`

#### Defined in

x-pack/plugins/actions/target/types/server/action_type_registry.d.ts:41

___

### isActionTypeEnabled

▸ **isActionTypeEnabled**(`id`, `options?`): `boolean`

Returns true if action type is enabled in the config and a valid license is used.

#### Parameters

| Name | Type |
| :------ | :------ |
| `id` | `string` |
| `options?` | `Object` |
| `options.notifyUsage` | `boolean` |

#### Returns

`boolean`

#### Defined in

x-pack/plugins/actions/target/types/server/action_type_registry.d.ts:35

___

### list

▸ **list**(): [`ActionType`](../interfaces/client.__internalNamespace.ActionType.md)[]

Returns a list of registered action types [{ id, name, enabled }]

#### Returns

[`ActionType`](../interfaces/client.__internalNamespace.ActionType.md)[]

#### Defined in

x-pack/plugins/actions/target/types/server/action_type_registry.d.ts:55

___

### register

▸ **register**<`Config`, `Secrets`, `Params`, `ExecutorResultData`\>(`actionType`): `void`

Registers an action type to the action type registry

#### Type parameters

| Name | Type |
| :------ | :------ |
| `Config` | extends [`ActionTypeConfig`](../modules/client.__internalNamespace.md#actiontypeconfig) = [`ActionTypeConfig`](../modules/client.__internalNamespace.md#actiontypeconfig) |
| `Secrets` | extends [`ActionTypeSecrets`](../modules/client.__internalNamespace.md#actiontypesecrets) = [`ActionTypeSecrets`](../modules/client.__internalNamespace.md#actiontypesecrets) |
| `Params` | extends [`ActionTypeParams`](../modules/client.__internalNamespace.md#actiontypeparams) = [`ActionTypeParams`](../modules/client.__internalNamespace.md#actiontypeparams) |
| `ExecutorResultData` | `void` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `actionType` | [`ActionType`](../interfaces/client.__internalNamespace.ActionType-1.md)<`Config`, `Secrets`, `Params`, `ExecutorResultData`\> |

#### Returns

`void`

#### Defined in

x-pack/plugins/actions/target/types/server/action_type_registry.d.ts:47
