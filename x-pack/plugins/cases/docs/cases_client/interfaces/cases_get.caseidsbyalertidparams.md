[Cases Client API Interface](../cases_client_api.md) / [cases/get](../modules/cases_get.md) / CaseIDsByAlertIDParams

# Interface: CaseIDsByAlertIDParams

[cases/get](../modules/cases_get.md).CaseIDsByAlertIDParams

Parameters for finding cases IDs using an alert ID

## Table of contents

### Properties

- [alertID](cases_get.caseidsbyalertidparams.md#alertid)
- [options](cases_get.caseidsbyalertidparams.md#options)

## Properties

### alertID

• **alertID**: *string*

The alert ID to search for

Defined in: [cases/get.ts:47](https://github.com/jonathan-buttner/kibana/blob/2085a3b4480/x-pack/plugins/cases/server/client/cases/get.ts#L47)

___

### options

• **options**: *object*

The filtering options when searching for associated cases.

#### Type declaration

| Name | Type |
| :------ | :------ |
| `owner` | *undefined* \| *string* \| *string*[] |

Defined in: [cases/get.ts:51](https://github.com/jonathan-buttner/kibana/blob/2085a3b4480/x-pack/plugins/cases/server/client/cases/get.ts#L51)
