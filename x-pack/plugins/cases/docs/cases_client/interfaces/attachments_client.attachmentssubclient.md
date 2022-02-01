[Cases Client API Interface](../README.md) / [attachments/client](../modules/attachments_client.md) / AttachmentsSubClient

# Interface: AttachmentsSubClient

[attachments/client](../modules/attachments_client.md).AttachmentsSubClient

API for interacting with the attachments to a case.

## Table of contents

### Methods

- [add](attachments_client.AttachmentsSubClient.md#add)
- [delete](attachments_client.AttachmentsSubClient.md#delete)
- [deleteAll](attachments_client.AttachmentsSubClient.md#deleteall)
- [find](attachments_client.AttachmentsSubClient.md#find)
- [get](attachments_client.AttachmentsSubClient.md#get)
- [getAll](attachments_client.AttachmentsSubClient.md#getall)
- [getAllAlertsAttachToCase](attachments_client.AttachmentsSubClient.md#getallalertsattachtocase)
- [update](attachments_client.AttachmentsSubClient.md#update)

## Methods

### add

▸ **add**(`params`): `Promise`<[`ICaseResponse`](typedoc_interfaces.ICaseResponse.md)\>

Adds an attachment to a case.

#### Parameters

| Name | Type |
| :------ | :------ |
| `params` | [`AddArgs`](attachments_client._internal_namespace.AddArgs.md) |

#### Returns

`Promise`<[`ICaseResponse`](typedoc_interfaces.ICaseResponse.md)\>

#### Defined in

[x-pack/plugins/cases/server/client/attachments/client.ts:35](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/client/attachments/client.ts#L35)

___

### delete

▸ **delete**(`deleteArgs`): `Promise`<`void`\>

Deletes a single attachment for a specific case.

#### Parameters

| Name | Type |
| :------ | :------ |
| `deleteArgs` | [`DeleteArgs`](attachments_client._internal_namespace.DeleteArgs.md) |

#### Returns

`Promise`<`void`\>

#### Defined in

[x-pack/plugins/cases/server/client/attachments/client.ts:43](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/client/attachments/client.ts#L43)

___

### deleteAll

▸ **deleteAll**(`deleteAllArgs`): `Promise`<`void`\>

Deletes all attachments associated with a single case.

#### Parameters

| Name | Type |
| :------ | :------ |
| `deleteAllArgs` | [`DeleteAllArgs`](attachments_client._internal_namespace.DeleteAllArgs.md) |

#### Returns

`Promise`<`void`\>

#### Defined in

[x-pack/plugins/cases/server/client/attachments/client.ts:39](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/client/attachments/client.ts#L39)

___

### find

▸ **find**(`findArgs`): `Promise`<[`ICommentsResponse`](typedoc_interfaces.ICommentsResponse.md)\>

Retrieves all comments matching the search criteria.

#### Parameters

| Name | Type |
| :------ | :------ |
| `findArgs` | [`FindArgs`](attachments_client._internal_namespace.FindArgs.md) |

#### Returns

`Promise`<[`ICommentsResponse`](typedoc_interfaces.ICommentsResponse.md)\>

#### Defined in

[x-pack/plugins/cases/server/client/attachments/client.ts:47](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/client/attachments/client.ts#L47)

___

### get

▸ **get**(`getArgs`): `Promise`<{ `comment`: `string` = rt.string; `owner`: `string` = rt.string; `type`: [`user`](../modules/client._internal_namespace.md#user)  } & { `created_at`: `string` = rt.string; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } = UserRT; `owner`: `string` = rt.string; `pushed_at`: ``null`` \| `string` ; `pushed_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `updated_at`: ``null`` \| `string` ; `updated_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }  } & { `id`: `string` = rt.string; `version`: `string` = rt.string } & { `alertId`: `string` \| `string`[] ; `index`: `string` \| `string`[] ; `owner`: `string` = rt.string; `rule`: { id: string \| null; name: string \| null; } ; `type`: [`alert`](../modules/client._internal_namespace.md#alert)  } & { `created_at`: `string` = rt.string; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } = UserRT; `owner`: `string` = rt.string; `pushed_at`: ``null`` \| `string` ; `pushed_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `updated_at`: ``null`` \| `string` ; `updated_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }  } & { `id`: `string` = rt.string; `version`: `string` = rt.string } & { `actions`: { targets: { hostname: string; endpointId: string; }[]; type: string; } ; `comment`: `string` = rt.string; `owner`: `string` = rt.string; `type`: [`actions`](../modules/client._internal_namespace.md#actions)  } & { `created_at`: `string` = rt.string; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } = UserRT; `owner`: `string` = rt.string; `pushed_at`: ``null`` \| `string` ; `pushed_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `updated_at`: ``null`` \| `string` ; `updated_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }  } & { `id`: `string` = rt.string; `version`: `string` = rt.string }\>

Retrieves a single attachment for a case.

#### Parameters

| Name | Type |
| :------ | :------ |
| `getArgs` | [`GetArgs`](attachments_client._internal_namespace.GetArgs.md) |

#### Returns

`Promise`<{ `comment`: `string` = rt.string; `owner`: `string` = rt.string; `type`: [`user`](../modules/client._internal_namespace.md#user)  } & { `created_at`: `string` = rt.string; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } = UserRT; `owner`: `string` = rt.string; `pushed_at`: ``null`` \| `string` ; `pushed_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `updated_at`: ``null`` \| `string` ; `updated_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }  } & { `id`: `string` = rt.string; `version`: `string` = rt.string } & { `alertId`: `string` \| `string`[] ; `index`: `string` \| `string`[] ; `owner`: `string` = rt.string; `rule`: { id: string \| null; name: string \| null; } ; `type`: [`alert`](../modules/client._internal_namespace.md#alert)  } & { `created_at`: `string` = rt.string; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } = UserRT; `owner`: `string` = rt.string; `pushed_at`: ``null`` \| `string` ; `pushed_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `updated_at`: ``null`` \| `string` ; `updated_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }  } & { `id`: `string` = rt.string; `version`: `string` = rt.string } & { `actions`: { targets: { hostname: string; endpointId: string; }[]; type: string; } ; `comment`: `string` = rt.string; `owner`: `string` = rt.string; `type`: [`actions`](../modules/client._internal_namespace.md#actions)  } & { `created_at`: `string` = rt.string; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } = UserRT; `owner`: `string` = rt.string; `pushed_at`: ``null`` \| `string` ; `pushed_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `updated_at`: ``null`` \| `string` ; `updated_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }  } & { `id`: `string` = rt.string; `version`: `string` = rt.string }\>

#### Defined in

[x-pack/plugins/cases/server/client/attachments/client.ts:59](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/client/attachments/client.ts#L59)

___

### getAll

▸ **getAll**(`getAllArgs`): `Promise`<[`IAllCommentsResponse`](typedoc_interfaces.IAllCommentsResponse.md)\>

Gets all attachments for a single case.

#### Parameters

| Name | Type |
| :------ | :------ |
| `getAllArgs` | [`GetAllArgs`](attachments_client._internal_namespace.GetAllArgs.md) |

#### Returns

`Promise`<[`IAllCommentsResponse`](typedoc_interfaces.IAllCommentsResponse.md)\>

#### Defined in

[x-pack/plugins/cases/server/client/attachments/client.ts:55](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/client/attachments/client.ts#L55)

___

### getAllAlertsAttachToCase

▸ **getAllAlertsAttachToCase**(`params`): `Promise`<{ `attached_at`: `string` = rt.string; `id`: `string` = rt.string; `index`: `string` = rt.string }[]\>

Retrieves all alerts attach to a case given a single case ID

#### Parameters

| Name | Type |
| :------ | :------ |
| `params` | [`GetAllAlertsAttachToCase`](attachments_client._internal_namespace.GetAllAlertsAttachToCase.md) |

#### Returns

`Promise`<{ `attached_at`: `string` = rt.string; `id`: `string` = rt.string; `index`: `string` = rt.string }[]\>

#### Defined in

[x-pack/plugins/cases/server/client/attachments/client.ts:51](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/client/attachments/client.ts#L51)

___

### update

▸ **update**(`updateArgs`): `Promise`<[`ICaseResponse`](typedoc_interfaces.ICaseResponse.md)\>

Updates a specific attachment.

The request must include all fields for the attachment. Even the fields that are not changing.

#### Parameters

| Name | Type |
| :------ | :------ |
| `updateArgs` | [`UpdateArgs`](attachments_client._internal_namespace.UpdateArgs.md) |

#### Returns

`Promise`<[`ICaseResponse`](typedoc_interfaces.ICaseResponse.md)\>

#### Defined in

[x-pack/plugins/cases/server/client/attachments/client.ts:65](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/client/attachments/client.ts#L65)
