[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_internal\_namespace](../modules/client._internal_namespace.md) / AggregationBuilder

# Interface: AggregationBuilder

[client](../modules/client.md).[_internal_namespace](../modules/client._internal_namespace.md).AggregationBuilder

## Table of contents

### Methods

- [build](client._internal_namespace.AggregationBuilder.md#build)
- [formatResponse](client._internal_namespace.AggregationBuilder.md#formatresponse)
- [getName](client._internal_namespace.AggregationBuilder.md#getname)

## Methods

### build

▸ **build**(): `Record`<`string`, `AggregationsAggregationContainer`\>

#### Returns

`Record`<`string`, `AggregationsAggregationContainer`\>

#### Defined in

[x-pack/plugins/cases/server/client/metrics/types.ts:20](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/client/metrics/types.ts#L20)

___

### formatResponse

▸ **formatResponse**(`aggregations`): `Object`

#### Parameters

| Name | Type |
| :------ | :------ |
| `aggregations` | [`AggregationResponse`](../modules/client._internal_namespace.md#aggregationresponse) |

#### Returns

`Object`

| Name | Type |
| :------ | :------ |
| `actions` | `undefined` \| { isolateHost?: { isolate: { total: number; }; unisolate: { total: number; }; } \| undefined; } |
| `alerts` | `undefined` \| { count?: number \| undefined; hosts?: { total: number; values: { name: string \| undefined; id: string; count: number; }[]; } \| undefined; users?: { total: number; values: { name: string; count: number; }[]; } \| undefined; } |
| `connectors` | `undefined` \| { `total`: `number` = rt.number } |
| `lifespan` | `undefined` \| { `closeDate`: ``null`` \| `string` ; `creationDate`: `string` = rt.string; `statusInfo`: { openDuration: number; inProgressDuration: number; reopenDates: string[]; } = StatusInfoRt } |

#### Defined in

[x-pack/plugins/cases/server/client/metrics/types.ts:21](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/client/metrics/types.ts#L21)

___

### getName

▸ **getName**(): `string`

#### Returns

`string`

#### Defined in

[x-pack/plugins/cases/server/client/metrics/types.ts:22](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/client/metrics/types.ts#L22)
