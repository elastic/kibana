[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_internal\_namespace](../modules/client._internal_namespace.md) / AlertService

# Class: AlertService

[client](../modules/client.md).[_internal_namespace](../modules/client._internal_namespace.md).AlertService

## Table of contents

### Constructors

- [constructor](client._internal_namespace.AlertService.md#constructor)

### Methods

- [bucketAlertsByIndexAndStatus](client._internal_namespace.AlertService.md#bucketalertsbyindexandstatus)
- [executeAggregations](client._internal_namespace.AlertService.md#executeaggregations)
- [getAlerts](client._internal_namespace.AlertService.md#getalerts)
- [translateStatus](client._internal_namespace.AlertService.md#translatestatus)
- [updateAlertsStatus](client._internal_namespace.AlertService.md#updatealertsstatus)
- [updateByQuery](client._internal_namespace.AlertService.md#updatebyquery)
- [getUniqueIdsIndices](client._internal_namespace.AlertService.md#getuniqueidsindices)
- [isEmptyAlert](client._internal_namespace.AlertService.md#isemptyalert)

## Constructors

### constructor

• **new AlertService**(`scopedClusterClient`, `logger`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `scopedClusterClient` | [`ElasticsearchClient`](../modules/client._internal_namespace.md#elasticsearchclient) |
| `logger` | `Logger` |

#### Defined in

[x-pack/plugins/cases/server/services/alerts/index.ts:24](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/services/alerts/index.ts#L24)

## Methods

### bucketAlertsByIndexAndStatus

▸ `Private` **bucketAlertsByIndexAndStatus**(`alerts`): `Map`<`string`, `Map`<`STATUS_VALUES`, [`TranslatedUpdateAlertRequest`](../interfaces/client._internal_namespace.TranslatedUpdateAlertRequest.md)[]\>\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `alerts` | [`UpdateAlertRequest`](../interfaces/client._internal_namespace.UpdateAlertRequest.md)[] |

#### Returns

`Map`<`string`, `Map`<`STATUS_VALUES`, [`TranslatedUpdateAlertRequest`](../interfaces/client._internal_namespace.TranslatedUpdateAlertRequest.md)[]\>\>

#### Defined in

[x-pack/plugins/cases/server/services/alerts/index.ts:98](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/services/alerts/index.ts#L98)

___

### executeAggregations

▸ **executeAggregations**(`__namedParameters`): `Promise`<[`AggregationResponse`](../modules/client._internal_namespace.md#aggregationresponse)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | `Object` |
| `__namedParameters.aggregationBuilders` | [`AggregationBuilder`](../interfaces/client._internal_namespace.AggregationBuilder.md)[] |
| `__namedParameters.alerts` | [`AlertIdIndex`](../interfaces/client._internal_namespace.AlertIdIndex.md)[] |

#### Returns

`Promise`<[`AggregationResponse`](../modules/client._internal_namespace.md#aggregationresponse)\>

#### Defined in

[x-pack/plugins/cases/server/services/alerts/index.ts:29](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/services/alerts/index.ts#L29)

___

### getAlerts

▸ **getAlerts**(`alertsInfo`): `Promise`<`undefined` \| [`AlertsResponse`](../interfaces/client._internal_namespace.AlertsResponse.md)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `alertsInfo` | [`AlertInfo`](../interfaces/client._internal_namespace.AlertInfo.md)[] |

#### Returns

`Promise`<`undefined` \| [`AlertsResponse`](../interfaces/client._internal_namespace.AlertsResponse.md)\>

#### Defined in

[x-pack/plugins/cases/server/services/alerts/index.ts:182](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/services/alerts/index.ts#L182)

___

### translateStatus

▸ `Private` **translateStatus**(`alert`): `STATUS_VALUES`

#### Parameters

| Name | Type |
| :------ | :------ |
| `alert` | [`UpdateAlertRequest`](../interfaces/client._internal_namespace.UpdateAlertRequest.md) |

#### Returns

`STATUS_VALUES`

#### Defined in

[x-pack/plugins/cases/server/services/alerts/index.ts:133](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/services/alerts/index.ts#L133)

___

### updateAlertsStatus

▸ **updateAlertsStatus**(`alerts`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `alerts` | [`UpdateAlertRequest`](../interfaces/client._internal_namespace.UpdateAlertRequest.md)[] |

#### Returns

`Promise`<`void`\>

#### Defined in

[x-pack/plugins/cases/server/services/alerts/index.ts:78](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/services/alerts/index.ts#L78)

___

### updateByQuery

▸ `Private` **updateByQuery**(`__namedParameters`): `Promise`<`TransportResult`<`UpdateByQueryResponse`, `unknown`\>[]\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [`string`, `Map`<`STATUS_VALUES`, [`TranslatedUpdateAlertRequest`](../interfaces/client._internal_namespace.TranslatedUpdateAlertRequest.md)[]\>] |

#### Returns

`Promise`<`TransportResult`<`UpdateByQueryResponse`, `unknown`\>[]\>

#### Defined in

[x-pack/plugins/cases/server/services/alerts/index.ts:151](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/services/alerts/index.ts#L151)

___

### getUniqueIdsIndices

▸ `Static` `Private` **getUniqueIdsIndices**(`alerts`): `Object`

#### Parameters

| Name | Type |
| :------ | :------ |
| `alerts` | [`AlertIdIndex`](../interfaces/client._internal_namespace.AlertIdIndex.md)[] |

#### Returns

`Object`

| Name | Type |
| :------ | :------ |
| `ids` | `string`[] |
| `indices` | `string`[] |

#### Defined in

[x-pack/plugins/cases/server/services/alerts/index.ts:62](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/services/alerts/index.ts#L62)

___

### isEmptyAlert

▸ `Static` `Private` **isEmptyAlert**(`alert`): `boolean`

#### Parameters

| Name | Type |
| :------ | :------ |
| `alert` | [`AlertInfo`](../interfaces/client._internal_namespace.AlertInfo.md) |

#### Returns

`boolean`

#### Defined in

[x-pack/plugins/cases/server/services/alerts/index.ts:129](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/services/alerts/index.ts#L129)
