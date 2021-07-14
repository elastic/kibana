[Cases Client API Interface](../cases_client_api.md) / cases/get

# Module: cases/get

## Table of contents

### Interfaces

- [CasesByAlertIDParams](../interfaces/cases_get.casesbyalertidparams.md)
- [GetParams](../interfaces/cases_get.getparams.md)

### Functions

- [getReporters](cases_get.md#getreporters)
- [getTags](cases_get.md#gettags)

## Functions

### getReporters

▸ **getReporters**(`params`: AllReportersFindRequest, `clientArgs`: CasesClientArgs): *Promise*<User[]\>

Retrieves the reporters from all the cases.

#### Parameters

| Name | Type |
| :------ | :------ |
| `params` | AllReportersFindRequest |
| `clientArgs` | CasesClientArgs |

**Returns:** *Promise*<User[]\>

Defined in: [cases/get.ts:289](https://github.com/elastic/kibana/blob/a80791aa4cc/x-pack/plugins/cases/server/client/cases/get.ts#L289)

___

### getTags

▸ **getTags**(`params`: AllTagsFindRequest, `clientArgs`: CasesClientArgs): *Promise*<string[]\>

Retrieves the tags from all the cases.

#### Parameters

| Name | Type |
| :------ | :------ |
| `params` | AllTagsFindRequest |
| `clientArgs` | CasesClientArgs |

**Returns:** *Promise*<string[]\>

Defined in: [cases/get.ts:239](https://github.com/elastic/kibana/blob/a80791aa4cc/x-pack/plugins/cases/server/client/cases/get.ts#L239)
