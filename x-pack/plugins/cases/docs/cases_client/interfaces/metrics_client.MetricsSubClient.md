[Cases Client API Interface](../README.md) / [metrics/client](../modules/metrics_client.md) / MetricsSubClient

# Interface: MetricsSubClient

[metrics/client](../modules/metrics_client.md).MetricsSubClient

API for interacting with the metrics.

## Table of contents

### Methods

- [getCaseMetrics](metrics_client.MetricsSubClient.md#getcasemetrics)

## Methods

### getCaseMetrics

▸ **getCaseMetrics**(`params`): `Promise`<{ `actions`: `undefined` \| { isolateHost?: { isolate: { total: number; }; unisolate: { total: number; }; } \| undefined; } ; `alerts`: `undefined` \| { count?: number \| undefined; hosts?: { total: number; values: { name: string \| undefined; id: string; count: number; }[]; } \| undefined; users?: { total: number; values: { name: string; count: number; }[]; } \| undefined; } ; `connectors`: `undefined` \| { `total`: `number` = rt.number } ; `lifespan`: `undefined` \| { `closeDate`: ``null`` \| `string` ; `creationDate`: `string` = rt.string; `statusInfo`: { openDuration: number; inProgressDuration: number; reopenDates: string[]; } = StatusInfoRt }  }\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `params` | [`CaseMetricsParams`](metrics_client._internal_namespace.CaseMetricsParams.md) |

#### Returns

`Promise`<{ `actions`: `undefined` \| { isolateHost?: { isolate: { total: number; }; unisolate: { total: number; }; } \| undefined; } ; `alerts`: `undefined` \| { count?: number \| undefined; hosts?: { total: number; values: { name: string \| undefined; id: string; count: number; }[]; } \| undefined; users?: { total: number; values: { name: string; count: number; }[]; } \| undefined; } ; `connectors`: `undefined` \| { `total`: `number` = rt.number } ; `lifespan`: `undefined` \| { `closeDate`: ``null`` \| `string` ; `creationDate`: `string` = rt.string; `statusInfo`: { openDuration: number; inProgressDuration: number; reopenDates: string[]; } = StatusInfoRt }  }\>

#### Defined in

[x-pack/plugins/cases/server/client/metrics/client.ts:19](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/client/metrics/client.ts#L19)
