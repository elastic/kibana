[cases](../server_client_api.md) / cases/find

# Module: cases/find

## Table of contents

### Functions

- [find](cases_find.md#find)

## Functions

### find

▸ `Const` **find**(`params`: { `defaultSearchOperator`: *undefined* \| ``"AND"`` \| ``"OR"`` ; `fields`: *undefined* \| *string*[] ; `owner`: *undefined* \| *string* \| *string*[] ; `page`: *undefined* \| *number* ; `perPage`: *undefined* \| *number* ; `reporters`: *undefined* \| *string* \| *string*[] ; `search`: *undefined* \| *string* ; `searchFields`: *undefined* \| *string* \| *string*[] ; `sortField`: *undefined* \| *string* ; `sortOrder`: *undefined* \| ``"desc"`` \| ``"asc"`` ; `status`: *undefined* \| open \| *any*[*any*] \| closed ; `tags`: *undefined* \| *string* \| *string*[] ; `type`: *undefined* \| collection \| individual  }, `clientArgs`: CasesClientArgs): *Promise*<{ `cases`: { description: string; status: CaseStatuses; tags: string[]; title: string; type: CaseType; connector: { id: string; name: string; } & ({ type: ConnectorTypes.jira; fields: { ...; } \| null; } \| { ...; } \| { ...; } \| { ...; } \| { ...; }); settings: { ...; }; owner: string; } & { closed\_at: string \| null; closed\_by: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } \| null; created\_at: string; created\_by: { ...; }; external\_service: ({ ...; } & { ...; }) \| null; updated\_at: string \| null; updated\_by: { ...; } \| null; } & { id: string; totalComment: number; totalAlerts: number; version: string; } & { `comments`: *undefined* \| { comment: string; type: CommentType.user; owner: string; } & { associationType: AssociationType; created\_at: string; created\_by: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }; ... 4 more ...; updated\_by: { ...; } \| null; } & { id: string; version: string; } & { type: CommentType.alert \| CommentType.generatedAlert; alertId: string \| string[]; index: string \| string[]; rule: { id: string \| null; name: string \| null; }; owner: string; } & { associationType: AssociationType; created\_at: string; created\_by: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }; ... 4 more ...; updated\_by: { ...; } \| null; } & { id: string; version: string; }[] ; `subCaseIds`: *undefined* \| *string*[] ; `subCases`: *undefined* \| { status: CaseStatuses; } & { closed\_at: string \| null; closed\_by: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } \| null; created\_at: string; created\_by: { ...; } \| null; updated\_at: string \| null; updated\_by: { ...; } \| null; owner: string; } & { id: string; totalComment: number; totalAlerts: number; version: string; } & { comments?: ((({ comment: string; type: CommentType.user; owner: string; } & { associationType: AssociationType; created\_at: string; created\_by: { email: string \| null \| undefined; full\_name: string \| ... 1 more ... \| undefined; username: string \| ... 1 more ... \| undefined; }; ... 4 more ...; updated\_by: { ...; } ...[]  }[] ; `page`: *number* ; `per_page`: *number* ; `total`: *number*  } & { `count_closed_cases`: *number* ; `count_in_progress_cases`: *number* ; `count_open_cases`: *number*  }\>

Retrieves a case and optionally its comments and sub case comments.

#### Parameters

| Name | Type |
| :------ | :------ |
| `params` | *object* |
| `params.defaultSearchOperator` | *undefined* \| ``"AND"`` \| ``"OR"`` |
| `params.fields` | *undefined* \| *string*[] |
| `params.owner` | *undefined* \| *string* \| *string*[] |
| `params.page` | *undefined* \| *number* |
| `params.perPage` | *undefined* \| *number* |
| `params.reporters` | *undefined* \| *string* \| *string*[] |
| `params.search` | *undefined* \| *string* |
| `params.searchFields` | *undefined* \| *string* \| *string*[] |
| `params.sortField` | *undefined* \| *string* |
| `params.sortOrder` | *undefined* \| ``"desc"`` \| ``"asc"`` |
| `params.status` | *undefined* \| open \| *any*[*any*] \| closed |
| `params.tags` | *undefined* \| *string* \| *string*[] |
| `params.type` | *undefined* \| collection \| individual |
| `clientArgs` | CasesClientArgs |

**Returns:** *Promise*<{ `cases`: { description: string; status: CaseStatuses; tags: string[]; title: string; type: CaseType; connector: { id: string; name: string; } & ({ type: ConnectorTypes.jira; fields: { ...; } \| null; } \| { ...; } \| { ...; } \| { ...; } \| { ...; }); settings: { ...; }; owner: string; } & { closed\_at: string \| null; closed\_by: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } \| null; created\_at: string; created\_by: { ...; }; external\_service: ({ ...; } & { ...; }) \| null; updated\_at: string \| null; updated\_by: { ...; } \| null; } & { id: string; totalComment: number; totalAlerts: number; version: string; } & { `comments`: *undefined* \| { comment: string; type: CommentType.user; owner: string; } & { associationType: AssociationType; created\_at: string; created\_by: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }; ... 4 more ...; updated\_by: { ...; } \| null; } & { id: string; version: string; } & { type: CommentType.alert \| CommentType.generatedAlert; alertId: string \| string[]; index: string \| string[]; rule: { id: string \| null; name: string \| null; }; owner: string; } & { associationType: AssociationType; created\_at: string; created\_by: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }; ... 4 more ...; updated\_by: { ...; } \| null; } & { id: string; version: string; }[] ; `subCaseIds`: *undefined* \| *string*[] ; `subCases`: *undefined* \| { status: CaseStatuses; } & { closed\_at: string \| null; closed\_by: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } \| null; created\_at: string; created\_by: { ...; } \| null; updated\_at: string \| null; updated\_by: { ...; } \| null; owner: string; } & { id: string; totalComment: number; totalAlerts: number; version: string; } & { comments?: ((({ comment: string; type: CommentType.user; owner: string; } & { associationType: AssociationType; created\_at: string; created\_by: { email: string \| null \| undefined; full\_name: string \| ... 1 more ... \| undefined; username: string \| ... 1 more ... \| undefined; }; ... 4 more ...; updated\_by: { ...; } ...[]  }[] ; `page`: *number* ; `per_page`: *number* ; `total`: *number*  } & { `count_closed_cases`: *number* ; `count_in_progress_cases`: *number* ; `count_open_cases`: *number*  }\>

Defined in: [cases/server/client/cases/find.ts:33](https://github.com/jonathan-buttner/kibana/blob/7a61a8b912c/x-pack/plugins/cases/server/client/cases/find.ts#L33)
