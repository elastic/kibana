[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_internal\_namespace](../modules/client._internal_namespace.md) / TaskRunnerContext

# Interface: TaskRunnerContext

[client](../modules/client.md).[_internal_namespace](../modules/client._internal_namespace.md).TaskRunnerContext

## Table of contents

### Properties

- [actionTypeRegistry](client._internal_namespace.TaskRunnerContext.md#actiontyperegistry)
- [basePathService](client._internal_namespace.TaskRunnerContext.md#basepathservice)
- [encryptedSavedObjectsClient](client._internal_namespace.TaskRunnerContext.md#encryptedsavedobjectsclient)
- [logger](client._internal_namespace.TaskRunnerContext.md#logger)
- [spaceIdToNamespace](client._internal_namespace.TaskRunnerContext.md#spaceidtonamespace)

### Methods

- [getUnsecuredSavedObjectsClient](client._internal_namespace.TaskRunnerContext.md#getunsecuredsavedobjectsclient)

## Properties

### actionTypeRegistry

• **actionTypeRegistry**: [`ActionTypeRegistryContract`](../modules/client._internal_namespace.md#actiontyperegistrycontract)

#### Defined in

x-pack/plugins/actions/target/types/server/lib/task_runner_factory.d.ts:8

___

### basePathService

• **basePathService**: [`IBasePath`](../modules/client._internal_namespace.md#ibasepath)

#### Defined in

x-pack/plugins/actions/target/types/server/lib/task_runner_factory.d.ts:11

___

### encryptedSavedObjectsClient

• **encryptedSavedObjectsClient**: [`EncryptedSavedObjectsClient`](client._internal_namespace.EncryptedSavedObjectsClient.md)

#### Defined in

x-pack/plugins/actions/target/types/server/lib/task_runner_factory.d.ts:9

___

### logger

• **logger**: `Logger`

#### Defined in

x-pack/plugins/actions/target/types/server/lib/task_runner_factory.d.ts:7

___

### spaceIdToNamespace

• **spaceIdToNamespace**: [`SpaceIdToNamespaceFunction`](../modules/client._internal_namespace.md#spaceidtonamespacefunction)

#### Defined in

x-pack/plugins/actions/target/types/server/lib/task_runner_factory.d.ts:10

## Methods

### getUnsecuredSavedObjectsClient

▸ **getUnsecuredSavedObjectsClient**(`request`): [`SavedObjectsClientContract`](../modules/client._internal_namespace.md#savedobjectsclientcontract)

#### Parameters

| Name | Type |
| :------ | :------ |
| `request` | [`KibanaRequest`](../classes/client._internal_namespace.KibanaRequest.md)<`unknown`, `unknown`, `unknown`, `any`\> |

#### Returns

[`SavedObjectsClientContract`](../modules/client._internal_namespace.md#savedobjectsclientcontract)

#### Defined in

x-pack/plugins/actions/target/types/server/lib/task_runner_factory.d.ts:12
