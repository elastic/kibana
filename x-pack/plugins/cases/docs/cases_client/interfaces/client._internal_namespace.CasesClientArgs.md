[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_internal\_namespace](../modules/client._internal_namespace.md) / CasesClientArgs

# Interface: CasesClientArgs

[client](../modules/client.md).[_internal_namespace](../modules/client._internal_namespace.md).CasesClientArgs

Parameters for initializing a cases client

## Table of contents

### Properties

- [actionsClient](client._internal_namespace.CasesClientArgs.md#actionsclient)
- [alertsService](client._internal_namespace.CasesClientArgs.md#alertsservice)
- [attachmentService](client._internal_namespace.CasesClientArgs.md#attachmentservice)
- [authorization](client._internal_namespace.CasesClientArgs.md#authorization)
- [caseConfigureService](client._internal_namespace.CasesClientArgs.md#caseconfigureservice)
- [caseService](client._internal_namespace.CasesClientArgs.md#caseservice)
- [connectorMappingsService](client._internal_namespace.CasesClientArgs.md#connectormappingsservice)
- [lensEmbeddableFactory](client._internal_namespace.CasesClientArgs.md#lensembeddablefactory)
- [logger](client._internal_namespace.CasesClientArgs.md#logger)
- [unsecuredSavedObjectsClient](client._internal_namespace.CasesClientArgs.md#unsecuredsavedobjectsclient)
- [user](client._internal_namespace.CasesClientArgs.md#user)
- [userActionService](client._internal_namespace.CasesClientArgs.md#useractionservice)

## Properties

### actionsClient

• `Readonly` **actionsClient**: `PublicMethodsOf`<[`ActionsClient`](../modules/client._internal_namespace.md#actionsclient)\>

#### Defined in

[x-pack/plugins/cases/server/client/types.ts:38](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/client/types.ts#L38)

___

### alertsService

• `Readonly` **alertsService**: [`AlertService`](../classes/client._internal_namespace.AlertService.md)

#### Defined in

[x-pack/plugins/cases/server/client/types.ts:33](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/client/types.ts#L33)

___

### attachmentService

• `Readonly` **attachmentService**: [`AttachmentService`](../classes/client._internal_namespace.AttachmentService.md)

#### Defined in

[x-pack/plugins/cases/server/client/types.ts:34](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/client/types.ts#L34)

___

### authorization

• `Readonly` **authorization**: `PublicMethodsOf`<[`Authorization`](../classes/client._internal_namespace.Authorization.md)\>

#### Defined in

[x-pack/plugins/cases/server/client/types.ts:37](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/client/types.ts#L37)

___

### caseConfigureService

• `Readonly` **caseConfigureService**: [`CaseConfigureService`](../classes/client._internal_namespace.CaseConfigureService.md)

#### Defined in

[x-pack/plugins/cases/server/client/types.ts:27](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/client/types.ts#L27)

___

### caseService

• `Readonly` **caseService**: [`CasesService`](../classes/client._internal_namespace.CasesService.md)

#### Defined in

[x-pack/plugins/cases/server/client/types.ts:28](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/client/types.ts#L28)

___

### connectorMappingsService

• `Readonly` **connectorMappingsService**: [`ConnectorMappingsService`](../classes/client._internal_namespace.ConnectorMappingsService.md)

#### Defined in

[x-pack/plugins/cases/server/client/types.ts:29](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/client/types.ts#L29)

___

### lensEmbeddableFactory

• `Readonly` **lensEmbeddableFactory**: () => [`EmbeddableRegistryDefinition`](client._internal_namespace.EmbeddableRegistryDefinition.md)<[`EmbeddableStateWithType`](../modules/client._internal_namespace.md#embeddablestatewithtype)\>

#### Type declaration

▸ (): [`EmbeddableRegistryDefinition`](client._internal_namespace.EmbeddableRegistryDefinition.md)<[`EmbeddableStateWithType`](../modules/client._internal_namespace.md#embeddablestatewithtype)\>

##### Returns

[`EmbeddableRegistryDefinition`](client._internal_namespace.EmbeddableRegistryDefinition.md)<[`EmbeddableStateWithType`](../modules/client._internal_namespace.md#embeddablestatewithtype)\>

#### Defined in

[x-pack/plugins/cases/server/client/types.ts:36](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/client/types.ts#L36)

___

### logger

• `Readonly` **logger**: `Logger`

#### Defined in

[x-pack/plugins/cases/server/client/types.ts:35](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/client/types.ts#L35)

___

### unsecuredSavedObjectsClient

• `Readonly` **unsecuredSavedObjectsClient**: [`SavedObjectsClientContract`](../modules/client._internal_namespace.md#savedobjectsclientcontract)

#### Defined in

[x-pack/plugins/cases/server/client/types.ts:31](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/client/types.ts#L31)

___

### user

• `Readonly` **user**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `email` | `undefined` \| ``null`` \| `string` |
| `full_name` | `undefined` \| ``null`` \| `string` |
| `username` | `undefined` \| ``null`` \| `string` |

#### Defined in

[x-pack/plugins/cases/server/client/types.ts:30](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/client/types.ts#L30)

___

### userActionService

• `Readonly` **userActionService**: [`CaseUserActionService`](../classes/client._internal_namespace.CaseUserActionService.md)

#### Defined in

[x-pack/plugins/cases/server/client/types.ts:32](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/client/types.ts#L32)
