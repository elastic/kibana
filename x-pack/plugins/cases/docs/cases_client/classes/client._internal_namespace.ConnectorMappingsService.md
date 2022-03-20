[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_internal\_namespace](../modules/client._internal_namespace.md) / ConnectorMappingsService

# Class: ConnectorMappingsService

[client](../modules/client.md).[_internal_namespace](../modules/client._internal_namespace.md).ConnectorMappingsService

## Table of contents

### Constructors

- [constructor](client._internal_namespace.ConnectorMappingsService.md#constructor)

### Methods

- [find](client._internal_namespace.ConnectorMappingsService.md#find)
- [post](client._internal_namespace.ConnectorMappingsService.md#post)
- [update](client._internal_namespace.ConnectorMappingsService.md#update)

## Constructors

### constructor

• **new ConnectorMappingsService**(`log`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `log` | `Logger` |

#### Defined in

[x-pack/plugins/cases/server/services/connector_mappings/index.ts:33](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/services/connector_mappings/index.ts#L33)

## Methods

### find

▸ **find**(`__namedParameters`): `Promise`<[`SavedObjectsFindResponse`](../interfaces/client._internal_namespace.SavedObjectsFindResponse.md)<{ `mappings`: { action\_type: "append" \| "nothing" \| "overwrite"; source: "description" \| "title" \| "comments"; target: string; }[] ; `owner`: `string` = rt.string }, `unknown`\>\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [`FindConnectorMappingsArgs`](../interfaces/client._internal_namespace.FindConnectorMappingsArgs.md) |

#### Returns

`Promise`<[`SavedObjectsFindResponse`](../interfaces/client._internal_namespace.SavedObjectsFindResponse.md)<{ `mappings`: { action\_type: "append" \| "nothing" \| "overwrite"; source: "description" \| "title" \| "comments"; target: string; }[] ; `owner`: `string` = rt.string }, `unknown`\>\>

#### Defined in

[x-pack/plugins/cases/server/services/connector_mappings/index.ts:35](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/services/connector_mappings/index.ts#L35)

___

### post

▸ **post**(`__namedParameters`): `Promise`<[`SavedObject`](../interfaces/client._internal_namespace.SavedObject.md)<{ `mappings`: { action\_type: "append" \| "nothing" \| "overwrite"; source: "description" \| "title" \| "comments"; target: string; }[] ; `owner`: `string` = rt.string }\>\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [`PostConnectorMappingsArgs`](../interfaces/client._internal_namespace.PostConnectorMappingsArgs.md) |

#### Returns

`Promise`<[`SavedObject`](../interfaces/client._internal_namespace.SavedObject.md)<{ `mappings`: { action\_type: "append" \| "nothing" \| "overwrite"; source: "description" \| "title" \| "comments"; target: string; }[] ; `owner`: `string` = rt.string }\>\>

#### Defined in

[x-pack/plugins/cases/server/services/connector_mappings/index.ts:48](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/services/connector_mappings/index.ts#L48)

___

### update

▸ **update**(`__namedParameters`): `Promise`<[`SavedObjectsUpdateResponse`](../interfaces/client._internal_namespace.SavedObjectsUpdateResponse.md)<{ `mappings`: { action\_type: "append" \| "nothing" \| "overwrite"; source: "description" \| "title" \| "comments"; target: string; }[] ; `owner`: `string` = rt.string }\>\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [`UpdateConnectorMappingsArgs`](../interfaces/client._internal_namespace.UpdateConnectorMappingsArgs.md) |

#### Returns

`Promise`<[`SavedObjectsUpdateResponse`](../interfaces/client._internal_namespace.SavedObjectsUpdateResponse.md)<{ `mappings`: { action\_type: "append" \| "nothing" \| "overwrite"; source: "description" \| "title" \| "comments"; target: string; }[] ; `owner`: `string` = rt.string }\>\>

#### Defined in

[x-pack/plugins/cases/server/services/connector_mappings/index.ts:68](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/services/connector_mappings/index.ts#L68)
