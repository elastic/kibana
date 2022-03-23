[Cases Client API Interface](../README.md) / [cases/client](../modules/cases_client.md) / CasesSubClient

# Interface: CasesSubClient

[cases/client](../modules/cases_client.md).CasesSubClient

API for interacting with the cases entities.

## Table of contents

### Methods

- [create](cases_client.CasesSubClient.md#create)
- [delete](cases_client.CasesSubClient.md#delete)
- [find](cases_client.CasesSubClient.md#find)
- [get](cases_client.CasesSubClient.md#get)
- [getCasesByAlertID](cases_client.CasesSubClient.md#getcasesbyalertid)
- [getReporters](cases_client.CasesSubClient.md#getreporters)
- [getTags](cases_client.CasesSubClient.md#gettags)
- [push](cases_client.CasesSubClient.md#push)
- [resolve](cases_client.CasesSubClient.md#resolve)
- [update](cases_client.CasesSubClient.md#update)

## Methods

### create

▸ **create**(`data`): `Promise`<[`ICaseResponse`](typedoc_interfaces.ICaseResponse.md)\>

Creates a case.

#### Parameters

| Name | Type |
| :------ | :------ |
| `data` | [`ICasePostRequest`](typedoc_interfaces.ICasePostRequest.md) |

#### Returns

`Promise`<[`ICaseResponse`](typedoc_interfaces.ICaseResponse.md)\>

#### Defined in

[x-pack/plugins/cases/server/client/cases/client.ts:51](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/client/cases/client.ts#L51)

___

### delete

▸ **delete**(`ids`): `Promise`<`void`\>

Delete a case and all its comments.

**`params`** ids an array of case IDs to delete

#### Parameters

| Name | Type |
| :------ | :------ |
| `ids` | `string`[] |

#### Returns

`Promise`<`void`\>

#### Defined in

[x-pack/plugins/cases/server/client/cases/client.ts:80](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/client/cases/client.ts#L80)

___

### find

▸ **find**(`params`): `Promise`<[`ICasesFindResponse`](typedoc_interfaces.ICasesFindResponse.md)\>

Returns cases that match the search criteria.

If the `owner` field is left empty then all the cases that the user has access to will be returned.

#### Parameters

| Name | Type |
| :------ | :------ |
| `params` | [`ICasesFindRequest`](typedoc_interfaces.ICasesFindRequest.md) |

#### Returns

`Promise`<[`ICasesFindResponse`](typedoc_interfaces.ICasesFindResponse.md)\>

#### Defined in

[x-pack/plugins/cases/server/client/cases/client.ts:57](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/client/cases/client.ts#L57)

___

### get

▸ **get**(`params`): `Promise`<[`ICaseResponse`](typedoc_interfaces.ICaseResponse.md)\>

Retrieves a single case with the specified ID.

#### Parameters

| Name | Type |
| :------ | :------ |
| `params` | [`GetParams`](cases_get.GetParams.md) |

#### Returns

`Promise`<[`ICaseResponse`](typedoc_interfaces.ICaseResponse.md)\>

#### Defined in

[x-pack/plugins/cases/server/client/cases/client.ts:61](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/client/cases/client.ts#L61)

___

### getCasesByAlertID

▸ **getCasesByAlertID**(`params`): `Promise`<{ `id`: `string` = rt.string; `title`: `string` = rt.string }[]\>

Retrieves the cases ID and title that have the requested alert attached to them

#### Parameters

| Name | Type |
| :------ | :------ |
| `params` | [`CasesByAlertIDParams`](cases_get.CasesByAlertIDParams.md) |

#### Returns

`Promise`<{ `id`: `string` = rt.string; `title`: `string` = rt.string }[]\>

#### Defined in

[x-pack/plugins/cases/server/client/cases/client.ts:92](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/client/cases/client.ts#L92)

___

### getReporters

▸ **getReporters**(`params`): `Promise`<{ `email`: `undefined` \| ``null`` \| `string` ; `full_name`: `undefined` \| ``null`` \| `string` ; `username`: `undefined` \| ``null`` \| `string`  }[]\>

Retrieves all the reporters across all accessible cases.

#### Parameters

| Name | Type |
| :------ | :------ |
| `params` | `Object` |
| `params.owner` | `undefined` \| `string` \| `string`[] |

#### Returns

`Promise`<{ `email`: `undefined` \| ``null`` \| `string` ; `full_name`: `undefined` \| ``null`` \| `string` ; `username`: `undefined` \| ``null`` \| `string`  }[]\>

#### Defined in

[x-pack/plugins/cases/server/client/cases/client.ts:88](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/client/cases/client.ts#L88)

___

### getTags

▸ **getTags**(`params`): `Promise`<`string`[]\>

Retrieves all the tags across all cases the user making the request has access to.

#### Parameters

| Name | Type |
| :------ | :------ |
| `params` | `Object` |
| `params.owner` | `undefined` \| `string` \| `string`[] |

#### Returns

`Promise`<`string`[]\>

#### Defined in

[x-pack/plugins/cases/server/client/cases/client.ts:84](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/client/cases/client.ts#L84)

___

### push

▸ **push**(`args`): `Promise`<[`ICaseResponse`](typedoc_interfaces.ICaseResponse.md)\>

Pushes a specific case to an external system.

#### Parameters

| Name | Type |
| :------ | :------ |
| `args` | [`PushParams`](cases_push.PushParams.md) |

#### Returns

`Promise`<[`ICaseResponse`](typedoc_interfaces.ICaseResponse.md)\>

#### Defined in

[x-pack/plugins/cases/server/client/cases/client.ts:70](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/client/cases/client.ts#L70)

___

### resolve

▸ **resolve**(`params`): `Promise`<[`ICaseResolveResponse`](typedoc_interfaces.ICaseResolveResponse.md)\>

**`experimental`**
Retrieves a single case resolving the specified ID.

#### Parameters

| Name | Type |
| :------ | :------ |
| `params` | [`GetParams`](cases_get.GetParams.md) |

#### Returns

`Promise`<[`ICaseResolveResponse`](typedoc_interfaces.ICaseResolveResponse.md)\>

#### Defined in

[x-pack/plugins/cases/server/client/cases/client.ts:66](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/client/cases/client.ts#L66)

___

### update

▸ **update**(`cases`): `Promise`<[`ICasesResponse`](typedoc_interfaces.ICasesResponse.md)\>

Update the specified cases with the passed in values.

#### Parameters

| Name | Type |
| :------ | :------ |
| `cases` | [`ICasesPatchRequest`](typedoc_interfaces.ICasesPatchRequest.md) |

#### Returns

`Promise`<[`ICasesResponse`](typedoc_interfaces.ICasesResponse.md)\>

#### Defined in

[x-pack/plugins/cases/server/client/cases/client.ts:74](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/client/cases/client.ts#L74)
