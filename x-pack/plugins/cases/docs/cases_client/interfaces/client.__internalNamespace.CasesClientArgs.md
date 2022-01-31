[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_\_internalNamespace](../modules/client.__internalNamespace.md) / CasesClientArgs

# Interface: CasesClientArgs

[client](../modules/client.md).[__internalNamespace](../modules/client.__internalNamespace.md).CasesClientArgs

Parameters for initializing a cases client

## Table of contents

### Properties

- [actionsClient](client.__internalNamespace.CasesClientArgs.md#actionsclient)
- [alertsService](client.__internalNamespace.CasesClientArgs.md#alertsservice)
- [attachmentService](client.__internalNamespace.CasesClientArgs.md#attachmentservice)
- [authorization](client.__internalNamespace.CasesClientArgs.md#authorization)
- [caseConfigureService](client.__internalNamespace.CasesClientArgs.md#caseconfigureservice)
- [caseService](client.__internalNamespace.CasesClientArgs.md#caseservice)
- [connectorMappingsService](client.__internalNamespace.CasesClientArgs.md#connectormappingsservice)
- [lensEmbeddableFactory](client.__internalNamespace.CasesClientArgs.md#lensembeddablefactory)
- [logger](client.__internalNamespace.CasesClientArgs.md#logger)
- [unsecuredSavedObjectsClient](client.__internalNamespace.CasesClientArgs.md#unsecuredsavedobjectsclient)
- [user](client.__internalNamespace.CasesClientArgs.md#user)
- [userActionService](client.__internalNamespace.CasesClientArgs.md#useractionservice)

## Properties

### actionsClient

• `Readonly` **actionsClient**: `PublicMethodsOf`<[`ActionsClient`](../modules/client.__internalNamespace.md#actionsclient)\>

#### Defined in

[x-pack/plugins/cases/server/client/types.ts:38](https://github.com/elastic/kibana/blob/06b0f975f60/x-pack/plugins/cases/server/client/types.ts#L38)

___

### alertsService

• `Readonly` **alertsService**: [`AlertService`](../classes/client.__internalNamespace.AlertService.md)

#### Defined in

[x-pack/plugins/cases/server/client/types.ts:33](https://github.com/elastic/kibana/blob/06b0f975f60/x-pack/plugins/cases/server/client/types.ts#L33)

___

### attachmentService

• `Readonly` **attachmentService**: [`AttachmentService`](../classes/client.__internalNamespace.AttachmentService.md)

#### Defined in

[x-pack/plugins/cases/server/client/types.ts:34](https://github.com/elastic/kibana/blob/06b0f975f60/x-pack/plugins/cases/server/client/types.ts#L34)

___

### authorization

• `Readonly` **authorization**: `PublicMethodsOf`<[`Authorization`](../classes/client.__internalNamespace.Authorization.md)\>

#### Defined in

[x-pack/plugins/cases/server/client/types.ts:37](https://github.com/elastic/kibana/blob/06b0f975f60/x-pack/plugins/cases/server/client/types.ts#L37)

___

### caseConfigureService

• `Readonly` **caseConfigureService**: [`CaseConfigureService`](../classes/client.__internalNamespace.CaseConfigureService.md)

#### Defined in

[x-pack/plugins/cases/server/client/types.ts:27](https://github.com/elastic/kibana/blob/06b0f975f60/x-pack/plugins/cases/server/client/types.ts#L27)

___

### caseService

• `Readonly` **caseService**: [`CasesService`](../classes/client.__internalNamespace.CasesService.md)

#### Defined in

[x-pack/plugins/cases/server/client/types.ts:28](https://github.com/elastic/kibana/blob/06b0f975f60/x-pack/plugins/cases/server/client/types.ts#L28)

___

### connectorMappingsService

• `Readonly` **connectorMappingsService**: [`ConnectorMappingsService`](../classes/client.__internalNamespace.ConnectorMappingsService.md)

#### Defined in

[x-pack/plugins/cases/server/client/types.ts:29](https://github.com/elastic/kibana/blob/06b0f975f60/x-pack/plugins/cases/server/client/types.ts#L29)

___

### lensEmbeddableFactory

• `Readonly` **lensEmbeddableFactory**: () => [`EmbeddableRegistryDefinition`](client.__internalNamespace.EmbeddableRegistryDefinition.md)<[`EmbeddableStateWithType`](../modules/client.__internalNamespace.md#embeddablestatewithtype)\>

#### Type declaration

▸ (): [`EmbeddableRegistryDefinition`](client.__internalNamespace.EmbeddableRegistryDefinition.md)<[`EmbeddableStateWithType`](../modules/client.__internalNamespace.md#embeddablestatewithtype)\>

##### Returns

[`EmbeddableRegistryDefinition`](client.__internalNamespace.EmbeddableRegistryDefinition.md)<[`EmbeddableStateWithType`](../modules/client.__internalNamespace.md#embeddablestatewithtype)\>

#### Defined in

[x-pack/plugins/cases/server/client/types.ts:36](https://github.com/elastic/kibana/blob/06b0f975f60/x-pack/plugins/cases/server/client/types.ts#L36)

___

### logger

• `Readonly` **logger**: `Logger`

#### Defined in

[x-pack/plugins/cases/server/client/types.ts:35](https://github.com/elastic/kibana/blob/06b0f975f60/x-pack/plugins/cases/server/client/types.ts#L35)

___

### unsecuredSavedObjectsClient

• `Readonly` **unsecuredSavedObjectsClient**: [`SavedObjectsClientContract`](../modules/client.__internalNamespace.md#savedobjectsclientcontract)

#### Defined in

[x-pack/plugins/cases/server/client/types.ts:31](https://github.com/elastic/kibana/blob/06b0f975f60/x-pack/plugins/cases/server/client/types.ts#L31)

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

[x-pack/plugins/cases/server/client/types.ts:30](https://github.com/elastic/kibana/blob/06b0f975f60/x-pack/plugins/cases/server/client/types.ts#L30)

___

### userActionService

• `Readonly` **userActionService**: [`CaseUserActionService`](../classes/client.__internalNamespace.CaseUserActionService.md)

#### Defined in

[x-pack/plugins/cases/server/client/types.ts:32](https://github.com/elastic/kibana/blob/06b0f975f60/x-pack/plugins/cases/server/client/types.ts#L32)
