[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_\_internalNamespace](../modules/client.__internalNamespace.md) / ActionsClient

# Class: ActionsClient

[client](../modules/client.md).[__internalNamespace](../modules/client.__internalNamespace.md).ActionsClient

## Table of contents

### Constructors

- [constructor](client.__internalNamespace.ActionsClient.md#constructor)

### Properties

- [actionExecutor](client.__internalNamespace.ActionsClient.md#actionexecutor)
- [actionTypeRegistry](client.__internalNamespace.ActionsClient.md#actiontyperegistry)
- [auditLogger](client.__internalNamespace.ActionsClient.md#auditlogger)
- [authorization](client.__internalNamespace.ActionsClient.md#authorization)
- [connectorTokenClient](client.__internalNamespace.ActionsClient.md#connectortokenclient)
- [defaultKibanaIndex](client.__internalNamespace.ActionsClient.md#defaultkibanaindex)
- [ephemeralExecutionEnqueuer](client.__internalNamespace.ActionsClient.md#ephemeralexecutionenqueuer)
- [executionEnqueuer](client.__internalNamespace.ActionsClient.md#executionenqueuer)
- [preconfiguredActions](client.__internalNamespace.ActionsClient.md#preconfiguredactions)
- [request](client.__internalNamespace.ActionsClient.md#request)
- [scopedClusterClient](client.__internalNamespace.ActionsClient.md#scopedclusterclient)
- [unsecuredSavedObjectsClient](client.__internalNamespace.ActionsClient.md#unsecuredsavedobjectsclient)
- [usageCounter](client.__internalNamespace.ActionsClient.md#usagecounter)

### Methods

- [create](client.__internalNamespace.ActionsClient.md#create)
- [delete](client.__internalNamespace.ActionsClient.md#delete)
- [enqueueExecution](client.__internalNamespace.ActionsClient.md#enqueueexecution)
- [ephemeralEnqueuedExecution](client.__internalNamespace.ActionsClient.md#ephemeralenqueuedexecution)
- [execute](client.__internalNamespace.ActionsClient.md#execute)
- [get](client.__internalNamespace.ActionsClient.md#get)
- [getAll](client.__internalNamespace.ActionsClient.md#getall)
- [getBulk](client.__internalNamespace.ActionsClient.md#getbulk)
- [isActionTypeEnabled](client.__internalNamespace.ActionsClient.md#isactiontypeenabled)
- [isPreconfigured](client.__internalNamespace.ActionsClient.md#ispreconfigured)
- [listTypes](client.__internalNamespace.ActionsClient.md#listtypes)
- [update](client.__internalNamespace.ActionsClient.md#update)

## Constructors

### constructor

• **new ActionsClient**(`__namedParameters`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [`ConstructorOptions`](../interfaces/client.__internalNamespace.ConstructorOptions.md) |

#### Defined in

x-pack/plugins/actions/target/types/server/actions_client.d.ts:57

## Properties

### actionExecutor

• `Private` `Readonly` **actionExecutor**: `any`

#### Defined in

x-pack/plugins/actions/target/types/server/actions_client.d.ts:49

___

### actionTypeRegistry

• `Private` `Readonly` **actionTypeRegistry**: `any`

#### Defined in

x-pack/plugins/actions/target/types/server/actions_client.d.ts:47

___

### auditLogger

• `Private` `Optional` `Readonly` **auditLogger**: `any`

#### Defined in

x-pack/plugins/actions/target/types/server/actions_client.d.ts:54

___

### authorization

• `Private` `Readonly` **authorization**: `any`

#### Defined in

x-pack/plugins/actions/target/types/server/actions_client.d.ts:51

___

### connectorTokenClient

• `Private` `Readonly` **connectorTokenClient**: `any`

#### Defined in

x-pack/plugins/actions/target/types/server/actions_client.d.ts:56

___

### defaultKibanaIndex

• `Private` `Readonly` **defaultKibanaIndex**: `any`

#### Defined in

x-pack/plugins/actions/target/types/server/actions_client.d.ts:44

___

### ephemeralExecutionEnqueuer

• `Private` `Readonly` **ephemeralExecutionEnqueuer**: `any`

#### Defined in

x-pack/plugins/actions/target/types/server/actions_client.d.ts:53

___

### executionEnqueuer

• `Private` `Readonly` **executionEnqueuer**: `any`

#### Defined in

x-pack/plugins/actions/target/types/server/actions_client.d.ts:52

___

### preconfiguredActions

• `Private` `Readonly` **preconfiguredActions**: `any`

#### Defined in

x-pack/plugins/actions/target/types/server/actions_client.d.ts:48

___

### request

• `Private` `Readonly` **request**: `any`

#### Defined in

x-pack/plugins/actions/target/types/server/actions_client.d.ts:50

___

### scopedClusterClient

• `Private` `Readonly` **scopedClusterClient**: `any`

#### Defined in

x-pack/plugins/actions/target/types/server/actions_client.d.ts:45

___

### unsecuredSavedObjectsClient

• `Private` `Readonly` **unsecuredSavedObjectsClient**: `any`

#### Defined in

x-pack/plugins/actions/target/types/server/actions_client.d.ts:46

___

### usageCounter

• `Private` `Optional` `Readonly` **usageCounter**: `any`

#### Defined in

x-pack/plugins/actions/target/types/server/actions_client.d.ts:55

## Methods

### create

▸ **create**(`__namedParameters`): `Promise`<[`ActionResult`](../interfaces/client.__internalNamespace.ActionResult.md)<[`ActionTypeConfig`](../modules/client.__internalNamespace.md#actiontypeconfig)\>\>

Create an action

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [`CreateOptions`](../interfaces/client.__internalNamespace.CreateOptions.md) |

#### Returns

`Promise`<[`ActionResult`](../interfaces/client.__internalNamespace.ActionResult.md)<[`ActionTypeConfig`](../modules/client.__internalNamespace.md#actiontypeconfig)\>\>

#### Defined in

x-pack/plugins/actions/target/types/server/actions_client.d.ts:61

___

### delete

▸ **delete**(`__namedParameters`): `Promise`<{}\>

Delete action

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | `Object` |
| `__namedParameters.id` | `string` |

#### Returns

`Promise`<{}\>

#### Defined in

x-pack/plugins/actions/target/types/server/actions_client.d.ts:83

___

### enqueueExecution

▸ **enqueueExecution**(`options`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `options` | [`ExecuteOptions`](../interfaces/client.__internalNamespace.ExecuteOptions-1.md) |

#### Returns

`Promise`<`void`\>

#### Defined in

x-pack/plugins/actions/target/types/server/actions_client.d.ts:87

___

### ephemeralEnqueuedExecution

▸ **ephemeralEnqueuedExecution**(`options`): `Promise`<[`RunNowResult`](../interfaces/client.__internalNamespace.RunNowResult.md)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `options` | [`ExecuteOptions`](../interfaces/client.__internalNamespace.ExecuteOptions-1.md) |

#### Returns

`Promise`<[`RunNowResult`](../interfaces/client.__internalNamespace.RunNowResult.md)\>

#### Defined in

x-pack/plugins/actions/target/types/server/actions_client.d.ts:88

___

### execute

▸ **execute**(`__namedParameters`): `Promise`<[`ActionTypeExecutorResult`](../interfaces/client.__internalNamespace.ActionTypeExecutorResult.md)<`unknown`\>\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | `Omit`<[`ExecuteOptions`](../interfaces/client.__internalNamespace.ExecuteOptions.md)<`unknown`\>, ``"request"``\> |

#### Returns

`Promise`<[`ActionTypeExecutorResult`](../interfaces/client.__internalNamespace.ActionTypeExecutorResult.md)<`unknown`\>\>

#### Defined in

x-pack/plugins/actions/target/types/server/actions_client.d.ts:86

___

### get

▸ **get**(`__namedParameters`): `Promise`<[`ActionResult`](../interfaces/client.__internalNamespace.ActionResult.md)<[`ActionTypeConfig`](../modules/client.__internalNamespace.md#actiontypeconfig)\>\>

Get an action

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | `Object` |
| `__namedParameters.id` | `string` |

#### Returns

`Promise`<[`ActionResult`](../interfaces/client.__internalNamespace.ActionResult.md)<[`ActionTypeConfig`](../modules/client.__internalNamespace.md#actiontypeconfig)\>\>

#### Defined in

x-pack/plugins/actions/target/types/server/actions_client.d.ts:69

___

### getAll

▸ **getAll**(): `Promise`<[`FindActionResult`](../interfaces/client.__internalNamespace.FindActionResult.md)[]\>

Get all actions with preconfigured list

#### Returns

`Promise`<[`FindActionResult`](../interfaces/client.__internalNamespace.FindActionResult.md)[]\>

#### Defined in

x-pack/plugins/actions/target/types/server/actions_client.d.ts:75

___

### getBulk

▸ **getBulk**(`ids`): `Promise`<[`ActionResult`](../interfaces/client.__internalNamespace.ActionResult.md)<[`ActionTypeConfig`](../modules/client.__internalNamespace.md#actiontypeconfig)\>[]\>

Get bulk actions with preconfigured list

#### Parameters

| Name | Type |
| :------ | :------ |
| `ids` | `string`[] |

#### Returns

`Promise`<[`ActionResult`](../interfaces/client.__internalNamespace.ActionResult.md)<[`ActionTypeConfig`](../modules/client.__internalNamespace.md#actiontypeconfig)\>[]\>

#### Defined in

x-pack/plugins/actions/target/types/server/actions_client.d.ts:79

___

### isActionTypeEnabled

▸ **isActionTypeEnabled**(`actionTypeId`, `options?`): `boolean`

#### Parameters

| Name | Type |
| :------ | :------ |
| `actionTypeId` | `string` |
| `options?` | `Object` |
| `options.notifyUsage` | `boolean` |

#### Returns

`boolean`

#### Defined in

x-pack/plugins/actions/target/types/server/actions_client.d.ts:90

___

### isPreconfigured

▸ **isPreconfigured**(`connectorId`): `boolean`

#### Parameters

| Name | Type |
| :------ | :------ |
| `connectorId` | `string` |

#### Returns

`boolean`

#### Defined in

x-pack/plugins/actions/target/types/server/actions_client.d.ts:93

___

### listTypes

▸ **listTypes**(): `Promise`<[`ActionType`](../interfaces/client.__internalNamespace.ActionType.md)[]\>

#### Returns

`Promise`<[`ActionType`](../interfaces/client.__internalNamespace.ActionType.md)[]\>

#### Defined in

x-pack/plugins/actions/target/types/server/actions_client.d.ts:89

___

### update

▸ **update**(`__namedParameters`): `Promise`<[`ActionResult`](../interfaces/client.__internalNamespace.ActionResult.md)<[`ActionTypeConfig`](../modules/client.__internalNamespace.md#actiontypeconfig)\>\>

Update action

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [`UpdateOptions`](../interfaces/client.__internalNamespace.UpdateOptions.md) |

#### Returns

`Promise`<[`ActionResult`](../interfaces/client.__internalNamespace.ActionResult.md)<[`ActionTypeConfig`](../modules/client.__internalNamespace.md#actiontypeconfig)\>\>

#### Defined in

x-pack/plugins/actions/target/types/server/actions_client.d.ts:65
