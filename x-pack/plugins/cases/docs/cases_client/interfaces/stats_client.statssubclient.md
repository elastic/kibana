[Cases Client API Interface](../cases_client_api.md) / [stats/client](../modules/stats_client.md) / StatsSubClient

# Interface: StatsSubClient

[stats/client](../modules/stats_client.md).StatsSubClient

Statistics API contract.

## Table of contents

### Methods

- [getStatusTotalsByType](stats_client.statssubclient.md#getstatustotalsbytype)

## Methods

### getStatusTotalsByType

▸ **getStatusTotalsByType**(`params`: { `owner`: *undefined* \| *string* \| *string*[]  }): *Promise*<{ `count_closed_cases`: *number* ; `count_in_progress_cases`: *number* ; `count_open_cases`: *number*  }\>

Retrieves the total number of open, closed, and in-progress cases.

#### Parameters

| Name | Type |
| :------ | :------ |
| `params` | *object* |
| `params.owner` | *undefined* \| *string* \| *string*[] |

**Returns:** *Promise*<{ `count_closed_cases`: *number* ; `count_in_progress_cases`: *number* ; `count_open_cases`: *number*  }\>

Defined in: [stats/client.ts:34](https://github.com/elastic/kibana/blob/a80791aa4cc/x-pack/plugins/cases/server/client/stats/client.ts#L34)
