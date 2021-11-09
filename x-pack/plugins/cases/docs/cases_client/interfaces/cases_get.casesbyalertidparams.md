[Cases Client API Interface](../cases_client_api.md) / [cases/get](../modules/cases_get.md) / CasesByAlertIDParams

# Interface: CasesByAlertIDParams

[cases/get](../modules/cases_get.md).CasesByAlertIDParams

Parameters for finding cases IDs using an alert ID

## Table of contents

### Properties

- [alertID](cases_get.casesbyalertidparams.md#alertid)
- [options](cases_get.casesbyalertidparams.md#options)

## Properties

### alertID

• **alertID**: *string*

The alert ID to search for

Defined in: [cases/get.ts:44](https://github.com/elastic/kibana/blob/a80791aa4cc/x-pack/plugins/cases/server/client/cases/get.ts#L44)

___

### options

• **options**: *object*

The filtering options when searching for associated cases.

#### Type declaration

| Name | Type |
| :------ | :------ |
| `owner` | *undefined* \| *string* \| *string*[] |

Defined in: [cases/get.ts:48](https://github.com/elastic/kibana/blob/a80791aa4cc/x-pack/plugins/cases/server/client/cases/get.ts#L48)
