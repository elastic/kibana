[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_\_internalNamespace](../modules/client.__internalNamespace.md) / ConstructorOptions

# Interface: ConstructorOptions

[client](../modules/client.md).[__internalNamespace](../modules/client.__internalNamespace.md).ConstructorOptions

## Table of contents

### Properties

- [actionExecutor](client.__internalNamespace.ConstructorOptions.md#actionexecutor)
- [actionTypeRegistry](client.__internalNamespace.ConstructorOptions.md#actiontyperegistry)
- [auditLogger](client.__internalNamespace.ConstructorOptions.md#auditlogger)
- [authorization](client.__internalNamespace.ConstructorOptions.md#authorization)
- [connectorTokenClient](client.__internalNamespace.ConstructorOptions.md#connectortokenclient)
- [defaultKibanaIndex](client.__internalNamespace.ConstructorOptions.md#defaultkibanaindex)
- [ephemeralExecutionEnqueuer](client.__internalNamespace.ConstructorOptions.md#ephemeralexecutionenqueuer)
- [executionEnqueuer](client.__internalNamespace.ConstructorOptions.md#executionenqueuer)
- [preconfiguredActions](client.__internalNamespace.ConstructorOptions.md#preconfiguredactions)
- [request](client.__internalNamespace.ConstructorOptions.md#request)
- [scopedClusterClient](client.__internalNamespace.ConstructorOptions.md#scopedclusterclient)
- [unsecuredSavedObjectsClient](client.__internalNamespace.ConstructorOptions.md#unsecuredsavedobjectsclient)
- [usageCounter](client.__internalNamespace.ConstructorOptions.md#usagecounter)

## Properties

### actionExecutor

• **actionExecutor**: [`ActionExecutorContract`](../modules/client.__internalNamespace.md#actionexecutorcontract)

#### Defined in

x-pack/plugins/actions/target/types/server/actions_client.d.ts:30

___

### actionTypeRegistry

• **actionTypeRegistry**: [`ActionTypeRegistry`](../classes/client.__internalNamespace.ActionTypeRegistry.md)

#### Defined in

x-pack/plugins/actions/target/types/server/actions_client.d.ts:27

___

### auditLogger

• `Optional` **auditLogger**: [`AuditLogger`](client.__internalNamespace.AuditLogger.md)

#### Defined in

x-pack/plugins/actions/target/types/server/actions_client.d.ts:35

___

### authorization

• **authorization**: [`ActionsAuthorization`](../classes/client.__internalNamespace.ActionsAuthorization.md)

#### Defined in

x-pack/plugins/actions/target/types/server/actions_client.d.ts:34

___

### connectorTokenClient

• **connectorTokenClient**: [`ConnectorTokenClientContract`](../modules/client.__internalNamespace.md#connectortokenclientcontract)

#### Defined in

x-pack/plugins/actions/target/types/server/actions_client.d.ts:37

___

### defaultKibanaIndex

• **defaultKibanaIndex**: `string`

#### Defined in

x-pack/plugins/actions/target/types/server/actions_client.d.ts:25

___

### ephemeralExecutionEnqueuer

• **ephemeralExecutionEnqueuer**: [`ExecutionEnqueuer`](../modules/client.__internalNamespace.md#executionenqueuer)<[`RunNowResult`](client.__internalNamespace.RunNowResult.md)\>

#### Defined in

x-pack/plugins/actions/target/types/server/actions_client.d.ts:32

___

### executionEnqueuer

• **executionEnqueuer**: [`ExecutionEnqueuer`](../modules/client.__internalNamespace.md#executionenqueuer)<`void`\>

#### Defined in

x-pack/plugins/actions/target/types/server/actions_client.d.ts:31

___

### preconfiguredActions

• **preconfiguredActions**: [`PreConfiguredAction`](client.__internalNamespace.PreConfiguredAction.md)<[`ActionTypeConfig`](../modules/client.__internalNamespace.md#actiontypeconfig), [`ActionTypeSecrets`](../modules/client.__internalNamespace.md#actiontypesecrets)\>[]

#### Defined in

x-pack/plugins/actions/target/types/server/actions_client.d.ts:29

___

### request

• **request**: [`KibanaRequest`](../classes/client.__internalNamespace.KibanaRequest.md)<`unknown`, `unknown`, `unknown`, `any`\>

#### Defined in

x-pack/plugins/actions/target/types/server/actions_client.d.ts:33

___

### scopedClusterClient

• **scopedClusterClient**: [`IScopedClusterClient`](client.__internalNamespace.IScopedClusterClient.md)

#### Defined in

x-pack/plugins/actions/target/types/server/actions_client.d.ts:26

___

### unsecuredSavedObjectsClient

• **unsecuredSavedObjectsClient**: [`SavedObjectsClientContract`](../modules/client.__internalNamespace.md#savedobjectsclientcontract)

#### Defined in

x-pack/plugins/actions/target/types/server/actions_client.d.ts:28

___

### usageCounter

• `Optional` **usageCounter**: [`IUsageCounter`](client.__internalNamespace.IUsageCounter.md)

#### Defined in

x-pack/plugins/actions/target/types/server/actions_client.d.ts:36
