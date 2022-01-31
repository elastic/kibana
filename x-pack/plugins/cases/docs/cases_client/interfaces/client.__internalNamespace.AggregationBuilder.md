[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_\_internalNamespace](../modules/client.__internalNamespace.md) / AggregationBuilder

# Interface: AggregationBuilder

[client](../modules/client.md).[__internalNamespace](../modules/client.__internalNamespace.md).AggregationBuilder

## Table of contents

### Methods

- [build](client.__internalNamespace.AggregationBuilder.md#build)
- [formatResponse](client.__internalNamespace.AggregationBuilder.md#formatresponse)
- [getName](client.__internalNamespace.AggregationBuilder.md#getname)

## Methods

### build

▸ **build**(): `Record`<`string`, `AggregationsAggregationContainer`\>

#### Returns

`Record`<`string`, `AggregationsAggregationContainer`\>

#### Defined in

[x-pack/plugins/cases/server/client/metrics/types.ts:20](https://github.com/elastic/kibana/blob/06b0f975f60/x-pack/plugins/cases/server/client/metrics/types.ts#L20)

___

### formatResponse

▸ **formatResponse**(`aggregations`): `Object`

#### Parameters

| Name | Type |
| :------ | :------ |
| `aggregations` | [`AggregationResponse`](../modules/client.__internalNamespace.md#aggregationresponse) |

#### Returns

`Object`

| Name | Type |
| :------ | :------ |
| `actions` | `undefined` \| { isolateHost?: { isolate: { total: number; }; unisolate: { total: number; }; } \| undefined; } |
| `alerts` | `undefined` \| { count?: number \| undefined; hosts?: { total: number; values: { name: string \| undefined; id: string; count: number; }[]; } \| undefined; users?: { total: number; values: { name: string; count: number; }[]; } \| undefined; } |
| `connectors` | `undefined` \| { `total`: `number` = rt.number } |
| `lifespan` | `undefined` \| { `closeDate`: ``null`` \| `string` ; `creationDate`: `string` = rt.string; `statusInfo`: { openDuration: number; inProgressDuration: number; reopenDates: string[]; } = StatusInfoRt } |

#### Defined in

[x-pack/plugins/cases/server/client/metrics/types.ts:21](https://github.com/elastic/kibana/blob/06b0f975f60/x-pack/plugins/cases/server/client/metrics/types.ts#L21)

___

### getName

▸ **getName**(): `string`

#### Returns

`string`

#### Defined in

[x-pack/plugins/cases/server/client/metrics/types.ts:22](https://github.com/elastic/kibana/blob/06b0f975f60/x-pack/plugins/cases/server/client/metrics/types.ts#L22)
