[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_\_internalNamespace](../modules/client.__internalNamespace.md) / SpacesServiceStart

# Interface: SpacesServiceStart

[client](../modules/client.md).[__internalNamespace](../modules/client.__internalNamespace.md).SpacesServiceStart

The Spaces service start contract.

## Table of contents

### Methods

- [createSpacesClient](client.__internalNamespace.SpacesServiceStart.md#createspacesclient)
- [getActiveSpace](client.__internalNamespace.SpacesServiceStart.md#getactivespace)
- [getSpaceId](client.__internalNamespace.SpacesServiceStart.md#getspaceid)
- [isInDefaultSpace](client.__internalNamespace.SpacesServiceStart.md#isindefaultspace)
- [namespaceToSpaceId](client.__internalNamespace.SpacesServiceStart.md#namespacetospaceid)
- [spaceIdToNamespace](client.__internalNamespace.SpacesServiceStart.md#spaceidtonamespace)

## Methods

### createSpacesClient

▸ **createSpacesClient**(`request`): [`ISpacesClient`](client.__internalNamespace.ISpacesClient.md)

Creates a scoped instance of the SpacesClient.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `request` | [`KibanaRequest`](../classes/client.__internalNamespace.KibanaRequest.md)<`unknown`, `unknown`, `unknown`, `any`\> | the request. |

#### Returns

[`ISpacesClient`](client.__internalNamespace.ISpacesClient.md)

#### Defined in

x-pack/plugins/spaces/target/types/server/spaces_service/spaces_service.d.ts:32

___

### getActiveSpace

▸ **getActiveSpace**(`request`): `Promise`<[`Space`](client.__internalNamespace.Space.md)\>

Retrieves the Space associated with the provided request.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `request` | [`KibanaRequest`](../classes/client.__internalNamespace.KibanaRequest.md)<`unknown`, `unknown`, `unknown`, `any`\> | the request. |

#### Returns

`Promise`<[`Space`](client.__internalNamespace.Space.md)\>

#### Defined in

x-pack/plugins/spaces/target/types/server/spaces_service/spaces_service.d.ts:47

___

### getSpaceId

▸ **getSpaceId**(`request`): `string`

Retrieves the space id associated with the provided request.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `request` | [`KibanaRequest`](../classes/client.__internalNamespace.KibanaRequest.md)<`unknown`, `unknown`, `unknown`, `any`\> | the request. |

#### Returns

`string`

#### Defined in

x-pack/plugins/spaces/target/types/server/spaces_service/spaces_service.d.ts:37

___

### isInDefaultSpace

▸ **isInDefaultSpace**(`request`): `boolean`

Indicates if the provided request is executing within the context of the `default` space.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `request` | [`KibanaRequest`](../classes/client.__internalNamespace.KibanaRequest.md)<`unknown`, `unknown`, `unknown`, `any`\> | the request. |

#### Returns

`boolean`

#### Defined in

x-pack/plugins/spaces/target/types/server/spaces_service/spaces_service.d.ts:42

___

### namespaceToSpaceId

▸ **namespaceToSpaceId**(`namespace`): `string`

Converts the provided namespace into the corresponding space id.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `namespace` | `undefined` \| `string` | the namespace to convert. |

#### Returns

`string`

#### Defined in

x-pack/plugins/spaces/target/types/server/spaces_service/spaces_service.d.ts:57

___

### spaceIdToNamespace

▸ **spaceIdToNamespace**(`spaceId`): `undefined` \| `string`

Converts the provided space id into the corresponding Saved Objects `namespace` id.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `spaceId` | `string` | the space id to convert. |

#### Returns

`undefined` \| `string`

#### Defined in

x-pack/plugins/spaces/target/types/server/spaces_service/spaces_service.d.ts:52
