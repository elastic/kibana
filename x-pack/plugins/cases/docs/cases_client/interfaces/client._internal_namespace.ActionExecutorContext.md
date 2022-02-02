[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_internal\_namespace](../modules/client._internal_namespace.md) / ActionExecutorContext

# Interface: ActionExecutorContext

[client](../modules/client.md).[_internal_namespace](../modules/client._internal_namespace.md).ActionExecutorContext

## Table of contents

### Properties

- [actionTypeRegistry](client._internal_namespace.ActionExecutorContext.md#actiontyperegistry)
- [encryptedSavedObjectsClient](client._internal_namespace.ActionExecutorContext.md#encryptedsavedobjectsclient)
- [eventLogger](client._internal_namespace.ActionExecutorContext.md#eventlogger)
- [getServices](client._internal_namespace.ActionExecutorContext.md#getservices)
- [logger](client._internal_namespace.ActionExecutorContext.md#logger)
- [preconfiguredActions](client._internal_namespace.ActionExecutorContext.md#preconfiguredactions)
- [spaces](client._internal_namespace.ActionExecutorContext.md#spaces)

### Methods

- [getActionsClientWithRequest](client._internal_namespace.ActionExecutorContext.md#getactionsclientwithrequest)

## Properties

### actionTypeRegistry

• **actionTypeRegistry**: [`ActionTypeRegistryContract`](../modules/client._internal_namespace.md#actiontyperegistrycontract)

#### Defined in

x-pack/plugins/actions/target/types/server/lib/action_executor.d.ts:16

___

### encryptedSavedObjectsClient

• **encryptedSavedObjectsClient**: [`EncryptedSavedObjectsClient`](client._internal_namespace.EncryptedSavedObjectsClient.md)

#### Defined in

x-pack/plugins/actions/target/types/server/lib/action_executor.d.ts:15

___

### eventLogger

• **eventLogger**: [`IEventLogger`](client._internal_namespace.IEventLogger.md)

#### Defined in

x-pack/plugins/actions/target/types/server/lib/action_executor.d.ts:17

___

### getServices

• **getServices**: [`GetServicesFunction`](../modules/client._internal_namespace.md#getservicesfunction)

#### Defined in

x-pack/plugins/actions/target/types/server/lib/action_executor.d.ts:13

___

### logger

• **logger**: `Logger`

#### Defined in

x-pack/plugins/actions/target/types/server/lib/action_executor.d.ts:11

___

### preconfiguredActions

• **preconfiguredActions**: [`PreConfiguredAction`](client._internal_namespace.PreConfiguredAction.md)<[`ActionTypeConfig`](../modules/client._internal_namespace.md#actiontypeconfig), [`ActionTypeSecrets`](../modules/client._internal_namespace.md#actiontypesecrets)\>[]

#### Defined in

x-pack/plugins/actions/target/types/server/lib/action_executor.d.ts:18

___

### spaces

• `Optional` **spaces**: [`SpacesServiceStart`](client._internal_namespace.SpacesServiceStart.md)

#### Defined in

x-pack/plugins/actions/target/types/server/lib/action_executor.d.ts:12

## Methods

### getActionsClientWithRequest

▸ **getActionsClientWithRequest**(`request`, `authorizationContext?`): `Promise`<`PublicMethodsOf`<[`ActionsClient`](../classes/client._internal_namespace.ActionsClient.md)\>\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `request` | [`KibanaRequest`](../classes/client._internal_namespace.KibanaRequest.md)<`unknown`, `unknown`, `unknown`, `any`\> |
| `authorizationContext?` | [`ActionExecutionSource`](client._internal_namespace.ActionExecutionSource.md)<`unknown`\> |

#### Returns

`Promise`<`PublicMethodsOf`<[`ActionsClient`](../classes/client._internal_namespace.ActionsClient.md)\>\>

#### Defined in

x-pack/plugins/actions/target/types/server/lib/action_executor.d.ts:14
