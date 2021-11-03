[Cases Client API Interface](../cases_client_api.md) / [attachments/client](../modules/attachments_client.md) / AttachmentsSubClient

# Interface: AttachmentsSubClient

[attachments/client](../modules/attachments_client.md).AttachmentsSubClient

API for interacting with the attachments to a case.

## Table of contents

### Methods

- [add](attachments_client.attachmentssubclient.md#add)
- [delete](attachments_client.attachmentssubclient.md#delete)
- [deleteAll](attachments_client.attachmentssubclient.md#deleteall)
- [find](attachments_client.attachmentssubclient.md#find)
- [get](attachments_client.attachmentssubclient.md#get)
- [getAll](attachments_client.attachmentssubclient.md#getall)
- [getAllAlertsAttachToCase](attachments_client.attachmentssubclient.md#getallalertsattachtocase)
- [update](attachments_client.attachmentssubclient.md#update)

## Methods

### add

▸ **add**(`params`: [*AddArgs*](attachments_add.addargs.md)): *Promise*<[*ICaseResponse*](typedoc_interfaces.icaseresponse.md)\>

Adds an attachment to a case.

#### Parameters

| Name | Type |
| :------ | :------ |
| `params` | [*AddArgs*](attachments_add.addargs.md) |

**Returns:** *Promise*<[*ICaseResponse*](typedoc_interfaces.icaseresponse.md)\>

Defined in: [attachments/client.ts:35](https://github.com/elastic/kibana/blob/a80791aa4cc/x-pack/plugins/cases/server/client/attachments/client.ts#L35)

___

### delete

▸ **delete**(`deleteArgs`: [*DeleteArgs*](attachments_delete.deleteargs.md)): *Promise*<void\>

Deletes a single attachment for a specific case.

#### Parameters

| Name | Type |
| :------ | :------ |
| `deleteArgs` | [*DeleteArgs*](attachments_delete.deleteargs.md) |

**Returns:** *Promise*<void\>

Defined in: [attachments/client.ts:43](https://github.com/elastic/kibana/blob/a80791aa4cc/x-pack/plugins/cases/server/client/attachments/client.ts#L43)

___

### deleteAll

▸ **deleteAll**(`deleteAllArgs`: [*DeleteAllArgs*](attachments_delete.deleteallargs.md)): *Promise*<void\>

Deletes all attachments associated with a single case.

#### Parameters

| Name | Type |
| :------ | :------ |
| `deleteAllArgs` | [*DeleteAllArgs*](attachments_delete.deleteallargs.md) |

**Returns:** *Promise*<void\>

Defined in: [attachments/client.ts:39](https://github.com/elastic/kibana/blob/a80791aa4cc/x-pack/plugins/cases/server/client/attachments/client.ts#L39)

___

### find

▸ **find**(`findArgs`: [*FindArgs*](attachments_get.findargs.md)): *Promise*<[*ICommentsResponse*](typedoc_interfaces.icommentsresponse.md)\>

Retrieves all comments matching the search criteria.

#### Parameters

| Name | Type |
| :------ | :------ |
| `findArgs` | [*FindArgs*](attachments_get.findargs.md) |

**Returns:** *Promise*<[*ICommentsResponse*](typedoc_interfaces.icommentsresponse.md)\>

Defined in: [attachments/client.ts:47](https://github.com/elastic/kibana/blob/a80791aa4cc/x-pack/plugins/cases/server/client/attachments/client.ts#L47)

___

### get

▸ **get**(`getArgs`: [*GetArgs*](attachments_get.getargs.md)): *Promise*<{ `comment`: *string* ; `owner`: *string* ; `type`: user  } & { `associationType`: AssociationType ; `created_at`: *string* ; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `owner`: *string* ; `pushed_at`: ``null`` \| *string* ; `pushed_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `updated_at`: ``null`` \| *string* ; `updated_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }  } & { `id`: *string* ; `version`: *string*  } & { `alertId`: *string* \| *string*[] ; `index`: *string* \| *string*[] ; `owner`: *string* ; `rule`: { id: string \| null; name: string \| null; } ; `type`: alert \| generatedAlert  } & { `associationType`: AssociationType ; `created_at`: *string* ; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `owner`: *string* ; `pushed_at`: ``null`` \| *string* ; `pushed_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `updated_at`: ``null`` \| *string* ; `updated_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }  } & { `id`: *string* ; `version`: *string*  } & { `actions`: { targets: { hostname: string; endpointId: string; }[]; type: string; } ; `comment`: *string* ; `owner`: *string* ; `type`: actions  } & { `associationType`: AssociationType ; `created_at`: *string* ; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `owner`: *string* ; `pushed_at`: ``null`` \| *string* ; `pushed_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `updated_at`: ``null`` \| *string* ; `updated_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }  } & { `id`: *string* ; `version`: *string*  }\>

Retrieves a single attachment for a case.

#### Parameters

| Name | Type |
| :------ | :------ |
| `getArgs` | [*GetArgs*](attachments_get.getargs.md) |

**Returns:** *Promise*<{ `comment`: *string* ; `owner`: *string* ; `type`: user  } & { `associationType`: AssociationType ; `created_at`: *string* ; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `owner`: *string* ; `pushed_at`: ``null`` \| *string* ; `pushed_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `updated_at`: ``null`` \| *string* ; `updated_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }  } & { `id`: *string* ; `version`: *string*  } & { `alertId`: *string* \| *string*[] ; `index`: *string* \| *string*[] ; `owner`: *string* ; `rule`: { id: string \| null; name: string \| null; } ; `type`: alert \| generatedAlert  } & { `associationType`: AssociationType ; `created_at`: *string* ; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `owner`: *string* ; `pushed_at`: ``null`` \| *string* ; `pushed_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `updated_at`: ``null`` \| *string* ; `updated_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }  } & { `id`: *string* ; `version`: *string*  } & { `actions`: { targets: { hostname: string; endpointId: string; }[]; type: string; } ; `comment`: *string* ; `owner`: *string* ; `type`: actions  } & { `associationType`: AssociationType ; `created_at`: *string* ; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `owner`: *string* ; `pushed_at`: ``null`` \| *string* ; `pushed_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `updated_at`: ``null`` \| *string* ; `updated_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }  } & { `id`: *string* ; `version`: *string*  }\>

Defined in: [attachments/client.ts:59](https://github.com/elastic/kibana/blob/a80791aa4cc/x-pack/plugins/cases/server/client/attachments/client.ts#L59)

___

### getAll

▸ **getAll**(`getAllArgs`: [*GetAllArgs*](attachments_get.getallargs.md)): *Promise*<[*IAllCommentsResponse*](typedoc_interfaces.iallcommentsresponse.md)\>

Gets all attachments for a single case.

#### Parameters

| Name | Type |
| :------ | :------ |
| `getAllArgs` | [*GetAllArgs*](attachments_get.getallargs.md) |

**Returns:** *Promise*<[*IAllCommentsResponse*](typedoc_interfaces.iallcommentsresponse.md)\>

Defined in: [attachments/client.ts:55](https://github.com/elastic/kibana/blob/a80791aa4cc/x-pack/plugins/cases/server/client/attachments/client.ts#L55)

___

### getAllAlertsAttachToCase

▸ **getAllAlertsAttachToCase**(`params`: [*GetAllAlertsAttachToCase*](attachments_get.getallalertsattachtocase.md)): *Promise*<{ `attached_at`: *string* ; `id`: *string* ; `index`: *string*  }[]\>

Retrieves all alerts attach to a case given a single case ID

#### Parameters

| Name | Type |
| :------ | :------ |
| `params` | [*GetAllAlertsAttachToCase*](attachments_get.getallalertsattachtocase.md) |

**Returns:** *Promise*<{ `attached_at`: *string* ; `id`: *string* ; `index`: *string*  }[]\>

Defined in: [attachments/client.ts:51](https://github.com/elastic/kibana/blob/a80791aa4cc/x-pack/plugins/cases/server/client/attachments/client.ts#L51)

___

### update

▸ **update**(`updateArgs`: [*UpdateArgs*](attachments_update.updateargs.md)): *Promise*<[*ICaseResponse*](typedoc_interfaces.icaseresponse.md)\>

Updates a specific attachment.

The request must include all fields for the attachment. Even the fields that are not changing.

#### Parameters

| Name | Type |
| :------ | :------ |
| `updateArgs` | [*UpdateArgs*](attachments_update.updateargs.md) |

**Returns:** *Promise*<[*ICaseResponse*](typedoc_interfaces.icaseresponse.md)\>

Defined in: [attachments/client.ts:65](https://github.com/elastic/kibana/blob/a80791aa4cc/x-pack/plugins/cases/server/client/attachments/client.ts#L65)
