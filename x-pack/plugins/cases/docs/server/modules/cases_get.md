[cases](../server_client_api.md) / cases/get

# Module: cases/get

## Table of contents

### Interfaces

- [CaseIDsByAlertIDParams](../interfaces/cases_get.caseidsbyalertidparams.md)

### Functions

- [get](cases_get.md#get)
- [getCaseIDsByAlertID](cases_get.md#getcaseidsbyalertid)
- [getReporters](cases_get.md#getreporters)
- [getTags](cases_get.md#gettags)

## Functions

### get

▸ `Const` **get**(`__namedParameters`: GetParams, `clientArgs`: CasesClientArgs): *Promise*<{ `connector`: { id: string; name: string; } & { type: ConnectorTypes.jira; fields: { issueType: string \| null; priority: string \| null; parent: string \| null; } \| null; } & { id: string; name: string; } & { type: ConnectorTypes.resilient; fields: { incidentTypes: string[] \| null; severityCode: string \| null; } \| null; } & { id: string; name: string; } & { type: ConnectorTypes.serviceNowITSM; fields: { impact: string \| null; severity: string \| null; urgency: string \| null; category: string \| null; subcategory: string \| null; } \| null; } & { id: string; name: string; } & { type: ConnectorTypes.serviceNowSIR; fields: { category: string \| null; destIp: boolean \| null; malwareHash: boolean \| null; malwareUrl: boolean \| null; priority: string \| null; sourceIp: boolean \| null; subcategory: string \| null; } \| null; } & { id: string; name: string; } & { type: ConnectorTypes.none; fields: null; } ; `description`: *string* ; `owner`: *string* ; `settings`: { syncAlerts: boolean; } ; `status`: CaseStatuses ; `tags`: *string*[] ; `title`: *string* ; `type`: CaseType  } & { `closed_at`: ``null`` \| *string* ; `closed_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `created_at`: *string* ; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `external_service`: ``null`` \| { connector\_id: string; connector\_name: string; external\_id: string; external\_title: string; external\_url: string; } & { pushed\_at: string; pushed\_by: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }; } ; `updated_at`: ``null`` \| *string* ; `updated_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }  } & { `id`: *string* ; `totalAlerts`: *number* ; `totalComment`: *number* ; `version`: *string*  } & { `comments`: *undefined* \| { `comment`: *string* ; `owner`: *string* ; `type`: user  } & { `associationType`: AssociationType ; `created_at`: *string* ; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `owner`: *string* ; `pushed_at`: ``null`` \| *string* ; `pushed_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `updated_at`: ``null`` \| *string* ; `updated_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }  } & { `id`: *string* ; `version`: *string*  } & { `alertId`: *string* \| *string*[] ; `index`: *string* \| *string*[] ; `owner`: *string* ; `rule`: { id: string \| null; name: string \| null; } ; `type`: alert \| generatedAlert  } & { `associationType`: AssociationType ; `created_at`: *string* ; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `owner`: *string* ; `pushed_at`: ``null`` \| *string* ; `pushed_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `updated_at`: ``null`` \| *string* ; `updated_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }  } & { `id`: *string* ; `version`: *string*  }[] ; `subCaseIds`: *undefined* \| *string*[] ; `subCases`: *undefined* \| { `status`: CaseStatuses  } & { `closed_at`: ``null`` \| *string* ; `closed_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `created_at`: *string* ; `created_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `owner`: *string* ; `updated_at`: ``null`` \| *string* ; `updated_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }  } & { `id`: *string* ; `totalAlerts`: *number* ; `totalComment`: *number* ; `version`: *string*  } & { comments?: ((({ comment: string; type: CommentType.user; owner: string; } & { associationType: AssociationType; created\_at: string; created\_by: { email: string \| null \| undefined; full\_name: string \| ... 1 more ... \| undefined; username: string \| ... 1 more ... \| undefined; }; ... 4 more ...; updated\_by: { ...; } ...[]  }\>

Retrieves a case and optionally its comments and sub case comments.

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | GetParams |
| `clientArgs` | CasesClientArgs |

**Returns:** *Promise*<{ `connector`: { id: string; name: string; } & { type: ConnectorTypes.jira; fields: { issueType: string \| null; priority: string \| null; parent: string \| null; } \| null; } & { id: string; name: string; } & { type: ConnectorTypes.resilient; fields: { incidentTypes: string[] \| null; severityCode: string \| null; } \| null; } & { id: string; name: string; } & { type: ConnectorTypes.serviceNowITSM; fields: { impact: string \| null; severity: string \| null; urgency: string \| null; category: string \| null; subcategory: string \| null; } \| null; } & { id: string; name: string; } & { type: ConnectorTypes.serviceNowSIR; fields: { category: string \| null; destIp: boolean \| null; malwareHash: boolean \| null; malwareUrl: boolean \| null; priority: string \| null; sourceIp: boolean \| null; subcategory: string \| null; } \| null; } & { id: string; name: string; } & { type: ConnectorTypes.none; fields: null; } ; `description`: *string* ; `owner`: *string* ; `settings`: { syncAlerts: boolean; } ; `status`: CaseStatuses ; `tags`: *string*[] ; `title`: *string* ; `type`: CaseType  } & { `closed_at`: ``null`` \| *string* ; `closed_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `created_at`: *string* ; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `external_service`: ``null`` \| { connector\_id: string; connector\_name: string; external\_id: string; external\_title: string; external\_url: string; } & { pushed\_at: string; pushed\_by: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }; } ; `updated_at`: ``null`` \| *string* ; `updated_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }  } & { `id`: *string* ; `totalAlerts`: *number* ; `totalComment`: *number* ; `version`: *string*  } & { `comments`: *undefined* \| { `comment`: *string* ; `owner`: *string* ; `type`: user  } & { `associationType`: AssociationType ; `created_at`: *string* ; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `owner`: *string* ; `pushed_at`: ``null`` \| *string* ; `pushed_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `updated_at`: ``null`` \| *string* ; `updated_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }  } & { `id`: *string* ; `version`: *string*  } & { `alertId`: *string* \| *string*[] ; `index`: *string* \| *string*[] ; `owner`: *string* ; `rule`: { id: string \| null; name: string \| null; } ; `type`: alert \| generatedAlert  } & { `associationType`: AssociationType ; `created_at`: *string* ; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `owner`: *string* ; `pushed_at`: ``null`` \| *string* ; `pushed_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `updated_at`: ``null`` \| *string* ; `updated_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }  } & { `id`: *string* ; `version`: *string*  }[] ; `subCaseIds`: *undefined* \| *string*[] ; `subCases`: *undefined* \| { `status`: CaseStatuses  } & { `closed_at`: ``null`` \| *string* ; `closed_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `created_at`: *string* ; `created_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `owner`: *string* ; `updated_at`: ``null`` \| *string* ; `updated_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }  } & { `id`: *string* ; `totalAlerts`: *number* ; `totalComment`: *number* ; `version`: *string*  } & { comments?: ((({ comment: string; type: CommentType.user; owner: string; } & { associationType: AssociationType; created\_at: string; created\_by: { email: string \| null \| undefined; full\_name: string \| ... 1 more ... \| undefined; username: string \| ... 1 more ... \| undefined; }; ... 4 more ...; updated\_by: { ...; } ...[]  }\>

Defined in: [cases/server/client/cases/get.ts:119](https://github.com/jonathan-buttner/kibana/blob/7a61a8b912c/x-pack/plugins/cases/server/client/cases/get.ts#L119)

___

### getCaseIDsByAlertID

▸ `Const` **getCaseIDsByAlertID**(`__namedParameters`: [*CaseIDsByAlertIDParams*](../interfaces/cases_get.caseidsbyalertidparams.md), `clientArgs`: CasesClientArgs): *Promise*<string[]\>

Case Client wrapper function for retrieving the case IDs that have a particular alert ID
attached to them. This handles RBAC before calling the saved object API.

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [*CaseIDsByAlertIDParams*](../interfaces/cases_get.caseidsbyalertidparams.md) |
| `clientArgs` | CasesClientArgs |

**Returns:** *Promise*<string[]\>

Defined in: [cases/server/client/cases/get.ts:55](https://github.com/jonathan-buttner/kibana/blob/7a61a8b912c/x-pack/plugins/cases/server/client/cases/get.ts#L55)

___

### getReporters

▸ **getReporters**(`params`: AllReportersFindRequest, `clientArgs`: CasesClientArgs): *Promise*<User[]\>

Retrieves the reporters from all the cases.

#### Parameters

| Name | Type |
| :------ | :------ |
| `params` | AllReportersFindRequest |
| `clientArgs` | CasesClientArgs |

**Returns:** *Promise*<User[]\>

Defined in: [cases/server/client/cases/get.ts:260](https://github.com/jonathan-buttner/kibana/blob/7a61a8b912c/x-pack/plugins/cases/server/client/cases/get.ts#L260)

___

### getTags

▸ **getTags**(`params`: AllTagsFindRequest, `clientArgs`: CasesClientArgs): *Promise*<string[]\>

Retrieves the tags from all the cases.

#### Parameters

| Name | Type |
| :------ | :------ |
| `params` | AllTagsFindRequest |
| `clientArgs` | CasesClientArgs |

**Returns:** *Promise*<string[]\>

Defined in: [cases/server/client/cases/get.ts:198](https://github.com/jonathan-buttner/kibana/blob/7a61a8b912c/x-pack/plugins/cases/server/client/cases/get.ts#L198)
