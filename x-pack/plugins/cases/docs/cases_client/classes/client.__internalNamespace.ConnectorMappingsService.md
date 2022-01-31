[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_\_internalNamespace](../modules/client.__internalNamespace.md) / ConnectorMappingsService

# Class: ConnectorMappingsService

[client](../modules/client.md).[__internalNamespace](../modules/client.__internalNamespace.md).ConnectorMappingsService

## Table of contents

### Constructors

- [constructor](client.__internalNamespace.ConnectorMappingsService.md#constructor)

### Methods

- [find](client.__internalNamespace.ConnectorMappingsService.md#find)
- [post](client.__internalNamespace.ConnectorMappingsService.md#post)
- [update](client.__internalNamespace.ConnectorMappingsService.md#update)

## Constructors

### constructor

• **new ConnectorMappingsService**(`log`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `log` | `Logger` |

#### Defined in

[x-pack/plugins/cases/server/services/connector_mappings/index.ts:33](https://github.com/elastic/kibana/blob/06b0f975f60/x-pack/plugins/cases/server/services/connector_mappings/index.ts#L33)

## Methods

### find

▸ **find**(`__namedParameters`): `Promise`<[`SavedObjectsFindResponse`](../interfaces/client.__internalNamespace.SavedObjectsFindResponse.md)<{ `mappings`: { action\_type: "append" \| "nothing" \| "overwrite"; source: "description" \| "title" \| "comments"; target: string; }[] ; `owner`: `string` = rt.string }, `unknown`\>\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [`FindConnectorMappingsArgs`](../interfaces/client.__internalNamespace.FindConnectorMappingsArgs.md) |

#### Returns

`Promise`<[`SavedObjectsFindResponse`](../interfaces/client.__internalNamespace.SavedObjectsFindResponse.md)<{ `mappings`: { action\_type: "append" \| "nothing" \| "overwrite"; source: "description" \| "title" \| "comments"; target: string; }[] ; `owner`: `string` = rt.string }, `unknown`\>\>

#### Defined in

[x-pack/plugins/cases/server/services/connector_mappings/index.ts:35](https://github.com/elastic/kibana/blob/06b0f975f60/x-pack/plugins/cases/server/services/connector_mappings/index.ts#L35)

___

### post

▸ **post**(`__namedParameters`): `Promise`<[`SavedObject`](../interfaces/client.__internalNamespace.SavedObject.md)<{ `mappings`: { action\_type: "append" \| "nothing" \| "overwrite"; source: "description" \| "title" \| "comments"; target: string; }[] ; `owner`: `string` = rt.string }\>\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [`PostConnectorMappingsArgs`](../interfaces/client.__internalNamespace.PostConnectorMappingsArgs.md) |

#### Returns

`Promise`<[`SavedObject`](../interfaces/client.__internalNamespace.SavedObject.md)<{ `mappings`: { action\_type: "append" \| "nothing" \| "overwrite"; source: "description" \| "title" \| "comments"; target: string; }[] ; `owner`: `string` = rt.string }\>\>

#### Defined in

[x-pack/plugins/cases/server/services/connector_mappings/index.ts:48](https://github.com/elastic/kibana/blob/06b0f975f60/x-pack/plugins/cases/server/services/connector_mappings/index.ts#L48)

___

### update

▸ **update**(`__namedParameters`): `Promise`<[`SavedObjectsUpdateResponse`](../interfaces/client.__internalNamespace.SavedObjectsUpdateResponse.md)<{ `mappings`: { action\_type: "append" \| "nothing" \| "overwrite"; source: "description" \| "title" \| "comments"; target: string; }[] ; `owner`: `string` = rt.string }\>\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [`UpdateConnectorMappingsArgs`](../interfaces/client.__internalNamespace.UpdateConnectorMappingsArgs.md) |

#### Returns

`Promise`<[`SavedObjectsUpdateResponse`](../interfaces/client.__internalNamespace.SavedObjectsUpdateResponse.md)<{ `mappings`: { action\_type: "append" \| "nothing" \| "overwrite"; source: "description" \| "title" \| "comments"; target: string; }[] ; `owner`: `string` = rt.string }\>\>

#### Defined in

[x-pack/plugins/cases/server/services/connector_mappings/index.ts:68](https://github.com/elastic/kibana/blob/06b0f975f60/x-pack/plugins/cases/server/services/connector_mappings/index.ts#L68)
