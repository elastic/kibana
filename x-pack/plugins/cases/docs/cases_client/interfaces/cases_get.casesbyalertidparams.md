[Cases Client API Interface](../README.md) / [cases/get](../modules/cases_get.md) / CasesByAlertIDParams

# Interface: CasesByAlertIDParams

[cases/get](../modules/cases_get.md).CasesByAlertIDParams

Parameters for finding cases IDs using an alert ID

## Table of contents

### Properties

- [alertID](cases_get.CasesByAlertIDParams.md#alertid)
- [options](cases_get.CasesByAlertIDParams.md#options)

## Properties

### alertID

• **alertID**: `string`

The alert ID to search for

#### Defined in

[x-pack/plugins/cases/server/client/cases/get.ts:45](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/client/cases/get.ts#L45)

___

### options

• **options**: `Object`

The filtering options when searching for associated cases.

#### Type declaration

| Name | Type |
| :------ | :------ |
| `owner` | `undefined` \| `string` \| `string`[] |

#### Defined in

[x-pack/plugins/cases/server/client/cases/get.ts:49](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/client/cases/get.ts#L49)
