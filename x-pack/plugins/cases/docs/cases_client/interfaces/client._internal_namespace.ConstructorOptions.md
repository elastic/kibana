[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_internal\_namespace](../modules/client._internal_namespace.md) / ConstructorOptions

# Interface: ConstructorOptions

[client](../modules/client.md).[_internal_namespace](../modules/client._internal_namespace.md).ConstructorOptions

## Table of contents

### Properties

- [actionExecutor](client._internal_namespace.ConstructorOptions.md#actionexecutor)
- [actionTypeRegistry](client._internal_namespace.ConstructorOptions.md#actiontyperegistry)
- [auditLogger](client._internal_namespace.ConstructorOptions.md#auditlogger)
- [authorization](client._internal_namespace.ConstructorOptions.md#authorization)
- [connectorTokenClient](client._internal_namespace.ConstructorOptions.md#connectortokenclient)
- [defaultKibanaIndex](client._internal_namespace.ConstructorOptions.md#defaultkibanaindex)
- [ephemeralExecutionEnqueuer](client._internal_namespace.ConstructorOptions.md#ephemeralexecutionenqueuer)
- [executionEnqueuer](client._internal_namespace.ConstructorOptions.md#executionenqueuer)
- [preconfiguredActions](client._internal_namespace.ConstructorOptions.md#preconfiguredactions)
- [request](client._internal_namespace.ConstructorOptions.md#request)
- [scopedClusterClient](client._internal_namespace.ConstructorOptions.md#scopedclusterclient)
- [unsecuredSavedObjectsClient](client._internal_namespace.ConstructorOptions.md#unsecuredsavedobjectsclient)
- [usageCounter](client._internal_namespace.ConstructorOptions.md#usagecounter)

## Properties

### actionExecutor

• **actionExecutor**: [`ActionExecutorContract`](../modules/client._internal_namespace.md#actionexecutorcontract)

#### Defined in

x-pack/plugins/actions/target/types/server/actions_client.d.ts:30

___

### actionTypeRegistry

• **actionTypeRegistry**: [`ActionTypeRegistry`](../classes/client._internal_namespace.ActionTypeRegistry.md)

#### Defined in

x-pack/plugins/actions/target/types/server/actions_client.d.ts:27

___

### auditLogger

• `Optional` **auditLogger**: [`AuditLogger`](client._internal_namespace.AuditLogger.md)

#### Defined in

x-pack/plugins/actions/target/types/server/actions_client.d.ts:35

___

### authorization

• **authorization**: [`ActionsAuthorization`](../classes/client._internal_namespace.ActionsAuthorization.md)

#### Defined in

x-pack/plugins/actions/target/types/server/actions_client.d.ts:34

___

### connectorTokenClient

• **connectorTokenClient**: [`ConnectorTokenClientContract`](../modules/client._internal_namespace.md#connectortokenclientcontract)

#### Defined in

x-pack/plugins/actions/target/types/server/actions_client.d.ts:37

___

### defaultKibanaIndex

• **defaultKibanaIndex**: `string`

#### Defined in

x-pack/plugins/actions/target/types/server/actions_client.d.ts:25

___

### ephemeralExecutionEnqueuer

• **ephemeralExecutionEnqueuer**: [`ExecutionEnqueuer`](../modules/client._internal_namespace.md#executionenqueuer)<[`RunNowResult`](client._internal_namespace.RunNowResult.md)\>

#### Defined in

x-pack/plugins/actions/target/types/server/actions_client.d.ts:32

___

### executionEnqueuer

• **executionEnqueuer**: [`ExecutionEnqueuer`](../modules/client._internal_namespace.md#executionenqueuer)<`void`\>

#### Defined in

x-pack/plugins/actions/target/types/server/actions_client.d.ts:31

___

### preconfiguredActions

• **preconfiguredActions**: [`PreConfiguredAction`](client._internal_namespace.PreConfiguredAction.md)<[`ActionTypeConfig`](../modules/client._internal_namespace.md#actiontypeconfig), [`ActionTypeSecrets`](../modules/client._internal_namespace.md#actiontypesecrets)\>[]

#### Defined in

x-pack/plugins/actions/target/types/server/actions_client.d.ts:29

___

### request

• **request**: [`KibanaRequest`](../classes/client._internal_namespace.KibanaRequest.md)<`unknown`, `unknown`, `unknown`, `any`\>

#### Defined in

x-pack/plugins/actions/target/types/server/actions_client.d.ts:33

___

### scopedClusterClient

• **scopedClusterClient**: [`IScopedClusterClient`](client._internal_namespace.IScopedClusterClient.md)

#### Defined in

x-pack/plugins/actions/target/types/server/actions_client.d.ts:26

___

### unsecuredSavedObjectsClient

• **unsecuredSavedObjectsClient**: [`SavedObjectsClientContract`](../modules/client._internal_namespace.md#savedobjectsclientcontract)

#### Defined in

x-pack/plugins/actions/target/types/server/actions_client.d.ts:28

___

### usageCounter

• `Optional` **usageCounter**: [`IUsageCounter`](client._internal_namespace.IUsageCounter.md)

#### Defined in

x-pack/plugins/actions/target/types/server/actions_client.d.ts:36
