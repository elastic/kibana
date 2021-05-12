[cases](../server_client_api.md) / [cases/get](../modules/cases_get.md) / CaseIDsByAlertIDParams

# Interface: CaseIDsByAlertIDParams

[cases/get](../modules/cases_get.md).CaseIDsByAlertIDParams

## Table of contents

### Properties

- [alertID](cases_get.caseidsbyalertidparams.md#alertid)
- [options](cases_get.caseidsbyalertidparams.md#options)

## Properties

### alertID

• **alertID**: *string*

The alert ID to search for

Defined in: [cases/server/client/cases/get.ts:44](https://github.com/jonathan-buttner/kibana/blob/7a61a8b912c/x-pack/plugins/cases/server/client/cases/get.ts#L44)

___

### options

• **options**: *object*

The filtering options when searching for associated cases.

#### Type declaration

| Name | Type |
| :------ | :------ |
| `owner` | *undefined* \| *string* \| *string*[] |

Defined in: [cases/server/client/cases/get.ts:48](https://github.com/jonathan-buttner/kibana/blob/7a61a8b912c/x-pack/plugins/cases/server/client/cases/get.ts#L48)
