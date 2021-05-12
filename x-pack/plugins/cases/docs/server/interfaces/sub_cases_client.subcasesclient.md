[cases](../server_client_api.md) / [sub_cases/client](../modules/sub_cases_client.md) / SubCasesClient

# Interface: SubCasesClient

[sub_cases/client](../modules/sub_cases_client.md).SubCasesClient

The API routes for interacting with sub cases.

## Table of contents

### Methods

- [delete](sub_cases_client.subcasesclient.md#delete)
- [find](sub_cases_client.subcasesclient.md#find)
- [get](sub_cases_client.subcasesclient.md#get)
- [update](sub_cases_client.subcasesclient.md#update)

## Methods

### delete

▸ **delete**(`ids`: *string*[]): *Promise*<void\>

Deletes the specified entities and their attachments.

#### Parameters

| Name | Type |
| :------ | :------ |
| `ids` | *string*[] |

**Returns:** *Promise*<void\>

Defined in: [cases/server/client/sub_cases/client.ts:60](https://github.com/jonathan-buttner/kibana/blob/7a61a8b912c/x-pack/plugins/cases/server/client/sub_cases/client.ts#L60)

___

### find

▸ **find**(`findArgs`: FindArgs): *Promise*<{ `page`: *number* ; `per_page`: *number* ; `subCases`: { status: CaseStatuses; } & { closed\_at: string \| null; closed\_by: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } \| null; created\_at: string; created\_by: { ...; } \| null; updated\_at: string \| null; updated\_by: { ...; } \| null; owner: string; } & { id: string; totalComment: number; totalAlerts: number; version: string; } & { `comments`: *undefined* \| { comment: string; type: CommentType.user; owner: string; } & { associationType: AssociationType; created\_at: string; created\_by: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }; ... 4 more ...; updated\_by: { ...; } \| null; } & { id: string; version: string; } & { type: CommentType.alert \| CommentType.generatedAlert; alertId: string \| string[]; index: string \| string[]; rule: { id: string \| null; name: string \| null; }; owner: string; } & { associationType: AssociationType; created\_at: string; created\_by: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }; ... 4 more ...; updated\_by: { ...; } \| null; } & { id: string; version: string; }[]  }[] ; `total`: *number*  } & { `count_closed_cases`: *number* ; `count_in_progress_cases`: *number* ; `count_open_cases`: *number*  }\>

Retrieves the sub cases matching the search criteria.

#### Parameters

| Name | Type |
| :------ | :------ |
| `findArgs` | FindArgs |

**Returns:** *Promise*<{ `page`: *number* ; `per_page`: *number* ; `subCases`: { status: CaseStatuses; } & { closed\_at: string \| null; closed\_by: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } \| null; created\_at: string; created\_by: { ...; } \| null; updated\_at: string \| null; updated\_by: { ...; } \| null; owner: string; } & { id: string; totalComment: number; totalAlerts: number; version: string; } & { `comments`: *undefined* \| { comment: string; type: CommentType.user; owner: string; } & { associationType: AssociationType; created\_at: string; created\_by: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }; ... 4 more ...; updated\_by: { ...; } \| null; } & { id: string; version: string; } & { type: CommentType.alert \| CommentType.generatedAlert; alertId: string \| string[]; index: string \| string[]; rule: { id: string \| null; name: string \| null; }; owner: string; } & { associationType: AssociationType; created\_at: string; created\_by: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }; ... 4 more ...; updated\_by: { ...; } \| null; } & { id: string; version: string; }[]  }[] ; `total`: *number*  } & { `count_closed_cases`: *number* ; `count_in_progress_cases`: *number* ; `count_open_cases`: *number*  }\>

Defined in: [cases/server/client/sub_cases/client.ts:64](https://github.com/jonathan-buttner/kibana/blob/7a61a8b912c/x-pack/plugins/cases/server/client/sub_cases/client.ts#L64)

___

### get

▸ **get**(`getArgs`: GetArgs): *Promise*<{ `status`: CaseStatuses  } & { `closed_at`: ``null`` \| *string* ; `closed_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `created_at`: *string* ; `created_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `owner`: *string* ; `updated_at`: ``null`` \| *string* ; `updated_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }  } & { `id`: *string* ; `totalAlerts`: *number* ; `totalComment`: *number* ; `version`: *string*  } & { `comments`: *undefined* \| { `comment`: *string* ; `owner`: *string* ; `type`: user  } & { `associationType`: AssociationType ; `created_at`: *string* ; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `owner`: *string* ; `pushed_at`: ``null`` \| *string* ; `pushed_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `updated_at`: ``null`` \| *string* ; `updated_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }  } & { `id`: *string* ; `version`: *string*  } & { `alertId`: *string* \| *string*[] ; `index`: *string* \| *string*[] ; `owner`: *string* ; `rule`: { id: string \| null; name: string \| null; } ; `type`: alert \| generatedAlert  } & { `associationType`: AssociationType ; `created_at`: *string* ; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `owner`: *string* ; `pushed_at`: ``null`` \| *string* ; `pushed_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `updated_at`: ``null`` \| *string* ; `updated_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }  } & { `id`: *string* ; `version`: *string*  }[]  }\>

Retrieves a single sub case.

#### Parameters

| Name | Type |
| :------ | :------ |
| `getArgs` | GetArgs |

**Returns:** *Promise*<{ `status`: CaseStatuses  } & { `closed_at`: ``null`` \| *string* ; `closed_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `created_at`: *string* ; `created_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `owner`: *string* ; `updated_at`: ``null`` \| *string* ; `updated_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }  } & { `id`: *string* ; `totalAlerts`: *number* ; `totalComment`: *number* ; `version`: *string*  } & { `comments`: *undefined* \| { `comment`: *string* ; `owner`: *string* ; `type`: user  } & { `associationType`: AssociationType ; `created_at`: *string* ; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `owner`: *string* ; `pushed_at`: ``null`` \| *string* ; `pushed_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `updated_at`: ``null`` \| *string* ; `updated_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }  } & { `id`: *string* ; `version`: *string*  } & { `alertId`: *string* \| *string*[] ; `index`: *string* \| *string*[] ; `owner`: *string* ; `rule`: { id: string \| null; name: string \| null; } ; `type`: alert \| generatedAlert  } & { `associationType`: AssociationType ; `created_at`: *string* ; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `owner`: *string* ; `pushed_at`: ``null`` \| *string* ; `pushed_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `updated_at`: ``null`` \| *string* ; `updated_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }  } & { `id`: *string* ; `version`: *string*  }[]  }\>

Defined in: [cases/server/client/sub_cases/client.ts:68](https://github.com/jonathan-buttner/kibana/blob/7a61a8b912c/x-pack/plugins/cases/server/client/sub_cases/client.ts#L68)

___

### update

▸ **update**(`subCases`: { `subCases`: { `status`: *undefined* \| open \| *any*[*any*] \| closed  } & { id: string; version: string; }[]  }): *Promise*<{ `status`: CaseStatuses  } & { `closed_at`: ``null`` \| *string* ; `closed_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `created_at`: *string* ; `created_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `owner`: *string* ; `updated_at`: ``null`` \| *string* ; `updated_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }  } & { `id`: *string* ; `totalAlerts`: *number* ; `totalComment`: *number* ; `version`: *string*  } & { `comments`: *undefined* \| { `comment`: *string* ; `owner`: *string* ; `type`: user  } & { `associationType`: AssociationType ; `created_at`: *string* ; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `owner`: *string* ; `pushed_at`: ``null`` \| *string* ; `pushed_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `updated_at`: ``null`` \| *string* ; `updated_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }  } & { `id`: *string* ; `version`: *string*  } & { `alertId`: *string* \| *string*[] ; `index`: *string* \| *string*[] ; `owner`: *string* ; `rule`: { id: string \| null; name: string \| null; } ; `type`: alert \| generatedAlert  } & { `associationType`: AssociationType ; `created_at`: *string* ; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `owner`: *string* ; `pushed_at`: ``null`` \| *string* ; `pushed_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `updated_at`: ``null`` \| *string* ; `updated_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }  } & { `id`: *string* ; `version`: *string*  }[]  }[]\>

Updates the specified sub cases to the new values included in the request.

#### Parameters

| Name | Type |
| :------ | :------ |
| `subCases` | *object* |
| `subCases.subCases` | { `status`: *undefined* \| open \| *any*[*any*] \| closed  } & { id: string; version: string; }[] |

**Returns:** *Promise*<{ `status`: CaseStatuses  } & { `closed_at`: ``null`` \| *string* ; `closed_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `created_at`: *string* ; `created_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `owner`: *string* ; `updated_at`: ``null`` \| *string* ; `updated_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }  } & { `id`: *string* ; `totalAlerts`: *number* ; `totalComment`: *number* ; `version`: *string*  } & { `comments`: *undefined* \| { `comment`: *string* ; `owner`: *string* ; `type`: user  } & { `associationType`: AssociationType ; `created_at`: *string* ; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `owner`: *string* ; `pushed_at`: ``null`` \| *string* ; `pushed_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `updated_at`: ``null`` \| *string* ; `updated_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }  } & { `id`: *string* ; `version`: *string*  } & { `alertId`: *string* \| *string*[] ; `index`: *string* \| *string*[] ; `owner`: *string* ; `rule`: { id: string \| null; name: string \| null; } ; `type`: alert \| generatedAlert  } & { `associationType`: AssociationType ; `created_at`: *string* ; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `owner`: *string* ; `pushed_at`: ``null`` \| *string* ; `pushed_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `updated_at`: ``null`` \| *string* ; `updated_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }  } & { `id`: *string* ; `version`: *string*  }[]  }[]\>

Defined in: [cases/server/client/sub_cases/client.ts:72](https://github.com/jonathan-buttner/kibana/blob/7a61a8b912c/x-pack/plugins/cases/server/client/sub_cases/client.ts#L72)
