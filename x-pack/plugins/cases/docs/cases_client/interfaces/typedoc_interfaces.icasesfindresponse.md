[Cases Client API Interface](../cases_client_api.md) / [typedoc_interfaces](../modules/typedoc_interfaces.md) / ICasesFindResponse

# Interface: ICasesFindResponse

[typedoc_interfaces](../modules/typedoc_interfaces.md).ICasesFindResponse

## Hierarchy

- *CasesFindResponse*

  ↳ **ICasesFindResponse**

## Table of contents

### Properties

- [cases](typedoc_interfaces.icasesfindresponse.md#cases)
- [count\_closed\_cases](typedoc_interfaces.icasesfindresponse.md#count_closed_cases)
- [count\_in\_progress\_cases](typedoc_interfaces.icasesfindresponse.md#count_in_progress_cases)
- [count\_open\_cases](typedoc_interfaces.icasesfindresponse.md#count_open_cases)
- [page](typedoc_interfaces.icasesfindresponse.md#page)
- [per\_page](typedoc_interfaces.icasesfindresponse.md#per_page)
- [total](typedoc_interfaces.icasesfindresponse.md#total)

## Properties

### cases

• **cases**: { `connector`: { id: string; name: string; } & { type: ConnectorTypes.jira; fields: { issueType: string \| null; priority: string \| null; parent: string \| null; } \| null; } & { id: string; name: string; } & { type: ConnectorTypes.none; fields: null; } & { id: string; name: string; } & { type: ConnectorTypes.resilient; fields: { incidentTypes: string[] \| null; severityCode: string \| null; } \| null; } & { id: string; name: string; } & { type: ConnectorTypes.serviceNowITSM; fields: { impact: string \| null; severity: string \| null; urgency: string \| null; category: string \| null; subcategory: string \| null; } \| null; } & { id: string; name: string; } & { type: ConnectorTypes.serviceNowSIR; fields: { category: string \| null; destIp: boolean \| null; malwareHash: boolean \| null; malwareUrl: boolean \| null; priority: string \| null; sourceIp: boolean \| null; subcategory: string \| null; } \| null; } & { id: string; name: string; } & { type: ConnectorTypes.swimlane; fields: { caseId: string \| null; } \| null; } ; `description`: *string* ; `owner`: *string* ; `settings`: { syncAlerts: boolean; } ; `status`: CaseStatuses ; `tags`: *string*[] ; `title`: *string* ; `type`: CaseType  } & { `closed_at`: ``null`` \| *string* ; `closed_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `created_at`: *string* ; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `external_service`: ``null`` \| { connector\_id: string; connector\_name: string; external\_id: string; external\_title: string; external\_url: string; } & { pushed\_at: string; pushed\_by: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }; } ; `updated_at`: ``null`` \| *string* ; `updated_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }  } & { `id`: *string* ; `totalAlerts`: *number* ; `totalComment`: *number* ; `version`: *string*  } & { `comments`: *undefined* \| { `comment`: *string* ; `owner`: *string* ; `type`: user  } & { `associationType`: AssociationType ; `created_at`: *string* ; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `owner`: *string* ; `pushed_at`: ``null`` \| *string* ; `pushed_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `updated_at`: ``null`` \| *string* ; `updated_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }  } & { `id`: *string* ; `version`: *string*  } & { `alertId`: *string* \| *string*[] ; `index`: *string* \| *string*[] ; `owner`: *string* ; `rule`: { id: string \| null; name: string \| null; } ; `type`: alert \| generatedAlert  } & { `associationType`: AssociationType ; `created_at`: *string* ; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `owner`: *string* ; `pushed_at`: ``null`` \| *string* ; `pushed_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `updated_at`: ``null`` \| *string* ; `updated_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }  } & { `id`: *string* ; `version`: *string*  } & { `actions`: { targets: { hostname: string; endpointId: string; }[]; type: string; } ; `comment`: *string* ; `owner`: *string* ; `type`: actions  } & { `associationType`: AssociationType ; `created_at`: *string* ; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `owner`: *string* ; `pushed_at`: ``null`` \| *string* ; `pushed_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `updated_at`: ``null`` \| *string* ; `updated_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }  } & { `id`: *string* ; `version`: *string*  }[] ; `subCaseIds`: *undefined* \| *string*[] ; `subCases`: *undefined* \| { `status`: CaseStatuses  } & { `closed_at`: ``null`` \| *string* ; `closed_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `created_at`: *string* ; `created_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `owner`: *string* ; `updated_at`: ``null`` \| *string* ; `updated_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }  } & { `id`: *string* ; `totalAlerts`: *number* ; `totalComment`: *number* ; `version`: *string*  } & { comments?: ((({ comment: string; type: CommentType.user; owner: string; } & { associationType: AssociationType; created\_at: string; created\_by: { email: string \| null \| undefined; full\_name: string \| ... 1 more ... \| undefined; username: string \| ... 1 more ... \| undefined; }; ... 4 more ...; updated\_by: { ...; } ...[]  }[]

Inherited from: CasesFindResponse.cases

___

### count\_closed\_cases

• **count\_closed\_cases**: *number*

Inherited from: CasesFindResponse.count\_closed\_cases

___

### count\_in\_progress\_cases

• **count\_in\_progress\_cases**: *number*

Inherited from: CasesFindResponse.count\_in\_progress\_cases

___

### count\_open\_cases

• **count\_open\_cases**: *number*

Inherited from: CasesFindResponse.count\_open\_cases

___

### page

• **page**: *number*

Inherited from: CasesFindResponse.page

___

### per\_page

• **per\_page**: *number*

Inherited from: CasesFindResponse.per\_page

___

### total

• **total**: *number*

Inherited from: CasesFindResponse.total
