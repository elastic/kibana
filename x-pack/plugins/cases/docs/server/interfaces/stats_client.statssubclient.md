[Cases Client API Interface](../cases_client_api.md) / [stats/client](../modules/stats_client.md) / StatsSubClient

# Interface: StatsSubClient

[stats/client](../modules/stats_client.md).StatsSubClient

Statistics API contract.

## Table of contents

### Methods

- [getStatusTotalsByType](stats_client.statssubclient.md#getstatustotalsbytype)

## Methods

### getStatusTotalsByType

▸ **getStatusTotalsByType**(): *Promise*<{ `count_closed_cases`: *number* ; `count_in_progress_cases`: *number* ; `count_open_cases`: *number*  }\>

Retrieves the total number of open, closed, and in-progress cases.

**Returns:** *Promise*<{ `count_closed_cases`: *number* ; `count_in_progress_cases`: *number* ; `count_open_cases`: *number*  }\>

Defined in: [stats/client.ts:21](https://github.com/jonathan-buttner/kibana/blob/1e8ae1f6ba4/x-pack/plugins/cases/server/client/stats/client.ts#L21)
