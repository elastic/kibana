[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_internal\_namespace](../modules/client._internal_namespace.md) / ActionsClient

# Class: ActionsClient

[client](../modules/client.md).[_internal_namespace](../modules/client._internal_namespace.md).ActionsClient

## Table of contents

### Constructors

- [constructor](client._internal_namespace.ActionsClient.md#constructor)

### Properties

- [actionExecutor](client._internal_namespace.ActionsClient.md#actionexecutor)
- [actionTypeRegistry](client._internal_namespace.ActionsClient.md#actiontyperegistry)
- [auditLogger](client._internal_namespace.ActionsClient.md#auditlogger)
- [authorization](client._internal_namespace.ActionsClient.md#authorization)
- [connectorTokenClient](client._internal_namespace.ActionsClient.md#connectortokenclient)
- [defaultKibanaIndex](client._internal_namespace.ActionsClient.md#defaultkibanaindex)
- [ephemeralExecutionEnqueuer](client._internal_namespace.ActionsClient.md#ephemeralexecutionenqueuer)
- [executionEnqueuer](client._internal_namespace.ActionsClient.md#executionenqueuer)
- [preconfiguredActions](client._internal_namespace.ActionsClient.md#preconfiguredactions)
- [request](client._internal_namespace.ActionsClient.md#request)
- [scopedClusterClient](client._internal_namespace.ActionsClient.md#scopedclusterclient)
- [unsecuredSavedObjectsClient](client._internal_namespace.ActionsClient.md#unsecuredsavedobjectsclient)
- [usageCounter](client._internal_namespace.ActionsClient.md#usagecounter)

### Methods

- [create](client._internal_namespace.ActionsClient.md#create)
- [delete](client._internal_namespace.ActionsClient.md#delete)
- [enqueueExecution](client._internal_namespace.ActionsClient.md#enqueueexecution)
- [ephemeralEnqueuedExecution](client._internal_namespace.ActionsClient.md#ephemeralenqueuedexecution)
- [execute](client._internal_namespace.ActionsClient.md#execute)
- [get](client._internal_namespace.ActionsClient.md#get)
- [getAll](client._internal_namespace.ActionsClient.md#getall)
- [getBulk](client._internal_namespace.ActionsClient.md#getbulk)
- [isActionTypeEnabled](client._internal_namespace.ActionsClient.md#isactiontypeenabled)
- [isPreconfigured](client._internal_namespace.ActionsClient.md#ispreconfigured)
- [listTypes](client._internal_namespace.ActionsClient.md#listtypes)
- [update](client._internal_namespace.ActionsClient.md#update)

## Constructors

### constructor

• **new ActionsClient**(`__namedParameters`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [`ConstructorOptions`](../interfaces/client._internal_namespace.ConstructorOptions.md) |

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

▸ **create**(`__namedParameters`): `Promise`<[`ActionResult`](../interfaces/client._internal_namespace.ActionResult.md)<[`ActionTypeConfig`](../modules/client._internal_namespace.md#actiontypeconfig)\>\>

Create an action

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [`CreateOptions`](../interfaces/client._internal_namespace.CreateOptions.md) |

#### Returns

`Promise`<[`ActionResult`](../interfaces/client._internal_namespace.ActionResult.md)<[`ActionTypeConfig`](../modules/client._internal_namespace.md#actiontypeconfig)\>\>

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
| `options` | [`ExecuteOptions`](../interfaces/client._internal_namespace.ExecuteOptions-1.md) |

#### Returns

`Promise`<`void`\>

#### Defined in

x-pack/plugins/actions/target/types/server/actions_client.d.ts:87

___

### ephemeralEnqueuedExecution

▸ **ephemeralEnqueuedExecution**(`options`): `Promise`<[`RunNowResult`](../interfaces/client._internal_namespace.RunNowResult.md)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `options` | [`ExecuteOptions`](../interfaces/client._internal_namespace.ExecuteOptions-1.md) |

#### Returns

`Promise`<[`RunNowResult`](../interfaces/client._internal_namespace.RunNowResult.md)\>

#### Defined in

x-pack/plugins/actions/target/types/server/actions_client.d.ts:88

___

### execute

▸ **execute**(`__namedParameters`): `Promise`<[`ActionTypeExecutorResult`](../interfaces/client._internal_namespace.ActionTypeExecutorResult.md)<`unknown`\>\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | `Omit`<[`ExecuteOptions`](../interfaces/client._internal_namespace.ExecuteOptions.md)<`unknown`\>, ``"request"``\> |

#### Returns

`Promise`<[`ActionTypeExecutorResult`](../interfaces/client._internal_namespace.ActionTypeExecutorResult.md)<`unknown`\>\>

#### Defined in

x-pack/plugins/actions/target/types/server/actions_client.d.ts:86

___

### get

▸ **get**(`__namedParameters`): `Promise`<[`ActionResult`](../interfaces/client._internal_namespace.ActionResult.md)<[`ActionTypeConfig`](../modules/client._internal_namespace.md#actiontypeconfig)\>\>

Get an action

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | `Object` |
| `__namedParameters.id` | `string` |

#### Returns

`Promise`<[`ActionResult`](../interfaces/client._internal_namespace.ActionResult.md)<[`ActionTypeConfig`](../modules/client._internal_namespace.md#actiontypeconfig)\>\>

#### Defined in

x-pack/plugins/actions/target/types/server/actions_client.d.ts:69

___

### getAll

▸ **getAll**(): `Promise`<[`FindActionResult`](../interfaces/client._internal_namespace.FindActionResult.md)[]\>

Get all actions with preconfigured list

#### Returns

`Promise`<[`FindActionResult`](../interfaces/client._internal_namespace.FindActionResult.md)[]\>

#### Defined in

x-pack/plugins/actions/target/types/server/actions_client.d.ts:75

___

### getBulk

▸ **getBulk**(`ids`): `Promise`<[`ActionResult`](../interfaces/client._internal_namespace.ActionResult.md)<[`ActionTypeConfig`](../modules/client._internal_namespace.md#actiontypeconfig)\>[]\>

Get bulk actions with preconfigured list

#### Parameters

| Name | Type |
| :------ | :------ |
| `ids` | `string`[] |

#### Returns

`Promise`<[`ActionResult`](../interfaces/client._internal_namespace.ActionResult.md)<[`ActionTypeConfig`](../modules/client._internal_namespace.md#actiontypeconfig)\>[]\>

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

▸ **listTypes**(): `Promise`<[`ActionType`](../interfaces/client._internal_namespace.ActionType.md)[]\>

#### Returns

`Promise`<[`ActionType`](../interfaces/client._internal_namespace.ActionType.md)[]\>

#### Defined in

x-pack/plugins/actions/target/types/server/actions_client.d.ts:89

___

### update

▸ **update**(`__namedParameters`): `Promise`<[`ActionResult`](../interfaces/client._internal_namespace.ActionResult.md)<[`ActionTypeConfig`](../modules/client._internal_namespace.md#actiontypeconfig)\>\>

Update action

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [`UpdateOptions`](../interfaces/client._internal_namespace.UpdateOptions.md) |

#### Returns

`Promise`<[`ActionResult`](../interfaces/client._internal_namespace.ActionResult.md)<[`ActionTypeConfig`](../modules/client._internal_namespace.md#actiontypeconfig)\>\>

#### Defined in

x-pack/plugins/actions/target/types/server/actions_client.d.ts:65
