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

Defined in: [cases/get.ts:290](https://github.com/jonathan-buttner/kibana/blob/b65ed845242/x-pack/plugins/cases/server/client/cases/get.ts#L290)

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

Defined in: [cases/get.ts:240](https://github.com/jonathan-buttner/kibana/blob/b65ed845242/x-pack/plugins/cases/server/client/cases/get.ts#L240)
