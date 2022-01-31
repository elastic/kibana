[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_\_internalNamespace](../modules/client.__internalNamespace.md) / TaskRunnerContext

# Interface: TaskRunnerContext

[client](../modules/client.md).[__internalNamespace](../modules/client.__internalNamespace.md).TaskRunnerContext

## Table of contents

### Properties

- [actionTypeRegistry](client.__internalNamespace.TaskRunnerContext.md#actiontyperegistry)
- [basePathService](client.__internalNamespace.TaskRunnerContext.md#basepathservice)
- [encryptedSavedObjectsClient](client.__internalNamespace.TaskRunnerContext.md#encryptedsavedobjectsclient)
- [logger](client.__internalNamespace.TaskRunnerContext.md#logger)
- [spaceIdToNamespace](client.__internalNamespace.TaskRunnerContext.md#spaceidtonamespace)

### Methods

- [getUnsecuredSavedObjectsClient](client.__internalNamespace.TaskRunnerContext.md#getunsecuredsavedobjectsclient)

## Properties

### actionTypeRegistry

• **actionTypeRegistry**: [`ActionTypeRegistryContract`](../modules/client.__internalNamespace.md#actiontyperegistrycontract)

#### Defined in

x-pack/plugins/actions/target/types/server/lib/task_runner_factory.d.ts:8

___

### basePathService

• **basePathService**: [`IBasePath`](../modules/client.__internalNamespace.md#ibasepath)

#### Defined in

x-pack/plugins/actions/target/types/server/lib/task_runner_factory.d.ts:11

___

### encryptedSavedObjectsClient

• **encryptedSavedObjectsClient**: [`EncryptedSavedObjectsClient`](client.__internalNamespace.EncryptedSavedObjectsClient.md)

#### Defined in

x-pack/plugins/actions/target/types/server/lib/task_runner_factory.d.ts:9

___

### logger

• **logger**: `Logger`

#### Defined in

x-pack/plugins/actions/target/types/server/lib/task_runner_factory.d.ts:7

___

### spaceIdToNamespace

• **spaceIdToNamespace**: [`SpaceIdToNamespaceFunction`](../modules/client.__internalNamespace.md#spaceidtonamespacefunction)

#### Defined in

x-pack/plugins/actions/target/types/server/lib/task_runner_factory.d.ts:10

## Methods

### getUnsecuredSavedObjectsClient

▸ **getUnsecuredSavedObjectsClient**(`request`): [`SavedObjectsClientContract`](../modules/client.__internalNamespace.md#savedobjectsclientcontract)

#### Parameters

| Name | Type |
| :------ | :------ |
| `request` | [`KibanaRequest`](../classes/client.__internalNamespace.KibanaRequest.md)<`unknown`, `unknown`, `unknown`, `any`\> |

#### Returns

[`SavedObjectsClientContract`](../modules/client.__internalNamespace.md#savedobjectsclientcontract)

#### Defined in

x-pack/plugins/actions/target/types/server/lib/task_runner_factory.d.ts:12
