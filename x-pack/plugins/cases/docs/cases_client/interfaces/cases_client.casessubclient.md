[Cases Client API Interface](../cases_client_api.md) / [cases/client](../modules/cases_client.md) / CasesSubClient

# Interface: CasesSubClient

[cases/client](../modules/cases_client.md).CasesSubClient

API for interacting with the cases entities.

## Table of contents

### Methods

- [create](cases_client.casessubclient.md#create)
- [delete](cases_client.casessubclient.md#delete)
- [find](cases_client.casessubclient.md#find)
- [get](cases_client.casessubclient.md#get)
- [getCasesByAlertID](cases_client.casessubclient.md#getcasesbyalertid)
- [getReporters](cases_client.casessubclient.md#getreporters)
- [getTags](cases_client.casessubclient.md#gettags)
- [push](cases_client.casessubclient.md#push)
- [update](cases_client.casessubclient.md#update)

## Methods

### create

▸ **create**(`data`: [*ICasePostRequest*](typedoc_interfaces.icasepostrequest.md)): *Promise*<[*ICaseResponse*](typedoc_interfaces.icaseresponse.md)\>

Creates a case.

#### Parameters

| Name | Type |
| :------ | :------ |
| `data` | [*ICasePostRequest*](typedoc_interfaces.icasepostrequest.md) |

**Returns:** *Promise*<[*ICaseResponse*](typedoc_interfaces.icaseresponse.md)\>

Defined in: [cases/client.ts:49](https://github.com/elastic/kibana/blob/a80791aa4cc/x-pack/plugins/cases/server/client/cases/client.ts#L49)

___

### delete

▸ **delete**(`ids`: *string*[]): *Promise*<void\>

Delete a case and all its comments.

**`params`** ids an array of case IDs to delete

#### Parameters

| Name | Type |
| :------ | :------ |
| `ids` | *string*[] |

**Returns:** *Promise*<void\>

Defined in: [cases/client.ts:73](https://github.com/elastic/kibana/blob/a80791aa4cc/x-pack/plugins/cases/server/client/cases/client.ts#L73)

___

### find

▸ **find**(`params`: [*ICasesFindRequest*](typedoc_interfaces.icasesfindrequest.md)): *Promise*<[*ICasesFindResponse*](typedoc_interfaces.icasesfindresponse.md)\>

Returns cases that match the search criteria.

If the `owner` field is left empty then all the cases that the user has access to will be returned.

#### Parameters

| Name | Type |
| :------ | :------ |
| `params` | [*ICasesFindRequest*](typedoc_interfaces.icasesfindrequest.md) |

**Returns:** *Promise*<[*ICasesFindResponse*](typedoc_interfaces.icasesfindresponse.md)\>

Defined in: [cases/client.ts:55](https://github.com/elastic/kibana/blob/a80791aa4cc/x-pack/plugins/cases/server/client/cases/client.ts#L55)

___

### get

▸ **get**(`params`: [*GetParams*](cases_get.getparams.md)): *Promise*<[*ICaseResponse*](typedoc_interfaces.icaseresponse.md)\>

Retrieves a single case with the specified ID.

#### Parameters

| Name | Type |
| :------ | :------ |
| `params` | [*GetParams*](cases_get.getparams.md) |

**Returns:** *Promise*<[*ICaseResponse*](typedoc_interfaces.icaseresponse.md)\>

Defined in: [cases/client.ts:59](https://github.com/elastic/kibana/blob/a80791aa4cc/x-pack/plugins/cases/server/client/cases/client.ts#L59)

___

### getCasesByAlertID

▸ **getCasesByAlertID**(`params`: [*CasesByAlertIDParams*](cases_get.casesbyalertidparams.md)): *Promise*<{ `id`: *string* ; `title`: *string*  }[]\>

Retrieves the cases ID and title that have the requested alert attached to them

#### Parameters

| Name | Type |
| :------ | :------ |
| `params` | [*CasesByAlertIDParams*](cases_get.casesbyalertidparams.md) |

**Returns:** *Promise*<{ `id`: *string* ; `title`: *string*  }[]\>

Defined in: [cases/client.ts:85](https://github.com/elastic/kibana/blob/a80791aa4cc/x-pack/plugins/cases/server/client/cases/client.ts#L85)

___

### getReporters

▸ **getReporters**(`params`: { `owner`: *undefined* \| *string* \| *string*[]  }): *Promise*<{ `email`: *undefined* \| ``null`` \| *string* ; `full_name`: *undefined* \| ``null`` \| *string* ; `username`: *undefined* \| ``null`` \| *string*  }[]\>

Retrieves all the reporters across all accessible cases.

#### Parameters

| Name | Type |
| :------ | :------ |
| `params` | *object* |
| `params.owner` | *undefined* \| *string* \| *string*[] |

**Returns:** *Promise*<{ `email`: *undefined* \| ``null`` \| *string* ; `full_name`: *undefined* \| ``null`` \| *string* ; `username`: *undefined* \| ``null`` \| *string*  }[]\>

Defined in: [cases/client.ts:81](https://github.com/elastic/kibana/blob/a80791aa4cc/x-pack/plugins/cases/server/client/cases/client.ts#L81)

___

### getTags

▸ **getTags**(`params`: { `owner`: *undefined* \| *string* \| *string*[]  }): *Promise*<string[]\>

Retrieves all the tags across all cases the user making the request has access to.

#### Parameters

| Name | Type |
| :------ | :------ |
| `params` | *object* |
| `params.owner` | *undefined* \| *string* \| *string*[] |

**Returns:** *Promise*<string[]\>

Defined in: [cases/client.ts:77](https://github.com/elastic/kibana/blob/a80791aa4cc/x-pack/plugins/cases/server/client/cases/client.ts#L77)

___

### push

▸ **push**(`args`: [*PushParams*](cases_push.pushparams.md)): *Promise*<[*ICaseResponse*](typedoc_interfaces.icaseresponse.md)\>

Pushes a specific case to an external system.

#### Parameters

| Name | Type |
| :------ | :------ |
| `args` | [*PushParams*](cases_push.pushparams.md) |

**Returns:** *Promise*<[*ICaseResponse*](typedoc_interfaces.icaseresponse.md)\>

Defined in: [cases/client.ts:63](https://github.com/elastic/kibana/blob/a80791aa4cc/x-pack/plugins/cases/server/client/cases/client.ts#L63)

___

### update

▸ **update**(`cases`: [*ICasesPatchRequest*](typedoc_interfaces.icasespatchrequest.md)): *Promise*<[*ICasesResponse*](typedoc_interfaces.icasesresponse.md)\>

Update the specified cases with the passed in values.

#### Parameters

| Name | Type |
| :------ | :------ |
| `cases` | [*ICasesPatchRequest*](typedoc_interfaces.icasespatchrequest.md) |

**Returns:** *Promise*<[*ICasesResponse*](typedoc_interfaces.icasesresponse.md)\>

Defined in: [cases/client.ts:67](https://github.com/elastic/kibana/blob/a80791aa4cc/x-pack/plugins/cases/server/client/cases/client.ts#L67)
