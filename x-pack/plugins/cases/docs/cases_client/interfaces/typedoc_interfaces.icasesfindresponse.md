[Cases Client API Interface](../README.md) / [typedoc\_interfaces](../modules/typedoc_interfaces.md) / ICasesFindResponse

# Interface: ICasesFindResponse

[typedoc_interfaces](../modules/typedoc_interfaces.md).ICasesFindResponse

## Hierarchy

- [`CasesFindResponse`](../modules/typedoc_interfaces._internal_namespace.md#casesfindresponse)

  ↳ **`ICasesFindResponse`**

## Table of contents

### Properties

- [cases](typedoc_interfaces.ICasesFindResponse.md#cases)
- [count\_closed\_cases](typedoc_interfaces.ICasesFindResponse.md#count_closed_cases)
- [count\_in\_progress\_cases](typedoc_interfaces.ICasesFindResponse.md#count_in_progress_cases)
- [count\_open\_cases](typedoc_interfaces.ICasesFindResponse.md#count_open_cases)
- [page](typedoc_interfaces.ICasesFindResponse.md#page)
- [per\_page](typedoc_interfaces.ICasesFindResponse.md#per_page)
- [total](typedoc_interfaces.ICasesFindResponse.md#total)

## Properties

### cases

• **cases**: { `connector`: { id: string; } & { type: ConnectorTypes.jira; fields: { issueType: string \| null; priority: string \| null; parent: string \| null; } \| null; } & { name: string; } & { id: string; } & { type: ConnectorTypes.none; fields: null; } & { name: string; } & { id: string; } & { type: ConnectorTypes.resilient; fields: { incidentTypes: string[] \| null; severityCode: string \| null; } \| null; } & { name: string; } & { id: string; } & { type: ConnectorTypes.serviceNowITSM; fields: { impact: string \| null; severity: string \| null; urgency: string \| null; category: string \| null; subcategory: string \| null; } \| null; } & { name: string; } & { id: string; } & { type: ConnectorTypes.serviceNowSIR; fields: { category: string \| null; destIp: boolean \| null; malwareHash: boolean \| null; malwareUrl: boolean \| null; priority: string \| null; sourceIp: boolean \| null; subcategory: string \| null; } \| null; } & { name: string; } & { id: string; } & { type: ConnectorTypes.swimlane; fields: { caseId: string \| null; } \| null; } & { name: string; } = CaseConnectorRt; `description`: `string` = rt.string; `owner`: `string` = rt.string; `settings`: { syncAlerts: boolean; } = SettingsRt; `status`: `CaseStatuses` = CaseStatusRt; `tags`: `string`[] ; `title`: `string` = rt.string } & { `closed_at`: ``null`` \| `string` ; `closed_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `created_at`: `string` = rt.string; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } = UserRT; `external_service`: ``null`` \| { connector\_id: string; } & { connector\_name: string; external\_id: string; external\_title: string; external\_url: string; pushed\_at: string; pushed\_by: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| ... 1 more ... \| undefined; }; } = CaseFullExternalServiceRt; `updated_at`: ``null`` \| `string` ; `updated_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }  } & { `id`: `string` = rt.string; `totalAlerts`: `number` = rt.number; `totalComment`: `number` = rt.number; `version`: `string` = rt.string } & { `comments`: `undefined` \| { `comment`: `string` = rt.string; `owner`: `string` = rt.string; `type`: [`user`](../modules/client._internal_namespace.md#user)  } & { `created_at`: `string` = rt.string; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } = UserRT; `owner`: `string` = rt.string; `pushed_at`: ``null`` \| `string` ; `pushed_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `updated_at`: ``null`` \| `string` ; `updated_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }  } & { `id`: `string` = rt.string; `version`: `string` = rt.string } & { `alertId`: `string` \| `string`[] ; `index`: `string` \| `string`[] ; `owner`: `string` = rt.string; `rule`: { id: string \| null; name: string \| null; } ; `type`: [`alert`](../modules/client._internal_namespace.md#alert)  } & { `created_at`: `string` = rt.string; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } = UserRT; `owner`: `string` = rt.string; `pushed_at`: ``null`` \| `string` ; `pushed_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `updated_at`: ``null`` \| `string` ; `updated_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }  } & { `id`: `string` = rt.string; `version`: `string` = rt.string } & { `actions`: { targets: { hostname: string; endpointId: string; }[]; type: string; } ; `comment`: `string` = rt.string; `owner`: `string` = rt.string; `type`: [`actions`](../modules/client._internal_namespace.md#actions)  } & { `created_at`: `string` = rt.string; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } = UserRT; `owner`: `string` = rt.string; `pushed_at`: ``null`` \| `string` ; `pushed_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `updated_at`: ``null`` \| `string` ; `updated_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }  } & { `id`: `string` = rt.string; `version`: `string` = rt.string }[]  }[]

#### Inherited from

CasesFindResponse.cases

___

### count\_closed\_cases

• **count\_closed\_cases**: `number` = `rt.number`

#### Inherited from

CasesFindResponse.count\_closed\_cases

___

### count\_in\_progress\_cases

• **count\_in\_progress\_cases**: `number` = `rt.number`

#### Inherited from

CasesFindResponse.count\_in\_progress\_cases

___

### count\_open\_cases

• **count\_open\_cases**: `number` = `rt.number`

#### Inherited from

CasesFindResponse.count\_open\_cases

___

### page

• **page**: `number` = `rt.number`

#### Inherited from

CasesFindResponse.page

___

### per\_page

• **per\_page**: `number` = `rt.number`

#### Inherited from

CasesFindResponse.per\_page

___

### total

• **total**: `number` = `rt.number`

#### Inherited from

CasesFindResponse.total
