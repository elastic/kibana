[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_internal\_namespace](../modules/client._internal_namespace.md) / CasesMapWithPageInfo

# Interface: CasesMapWithPageInfo

[client](../modules/client.md).[_internal_namespace](../modules/client._internal_namespace.md).CasesMapWithPageInfo

## Table of contents

### Properties

- [casesMap](client._internal_namespace.CasesMapWithPageInfo.md#casesmap)
- [page](client._internal_namespace.CasesMapWithPageInfo.md#page)
- [perPage](client._internal_namespace.CasesMapWithPageInfo.md#perpage)
- [total](client._internal_namespace.CasesMapWithPageInfo.md#total)

## Properties

### casesMap

• **casesMap**: `Map`<`string`, { `connector`: { id: string; } & { type: ConnectorTypes.jira; fields: { issueType: string \| null; priority: string \| null; parent: string \| null; } \| null; } & { name: string; } & { id: string; } & { type: ConnectorTypes.none; fields: null; } & { name: string; } & { id: string; } & { type: ConnectorTypes.resilient; fields: { incidentTypes: string[] \| null; severityCode: string \| null; } \| null; } & { name: string; } & { id: string; } & { type: ConnectorTypes.serviceNowITSM; fields: { impact: string \| null; severity: string \| null; urgency: string \| null; category: string \| null; subcategory: string \| null; } \| null; } & { name: string; } & { id: string; } & { type: ConnectorTypes.serviceNowSIR; fields: { category: string \| null; destIp: boolean \| null; malwareHash: boolean \| null; malwareUrl: boolean \| null; priority: string \| null; sourceIp: boolean \| null; subcategory: string \| null; } \| null; } & { name: string; } & { id: string; } & { type: ConnectorTypes.swimlane; fields: { caseId: string \| null; } \| null; } & { name: string; } = CaseConnectorRt; `description`: `string` = rt.string; `owner`: `string` = rt.string; `settings`: { syncAlerts: boolean; } = SettingsRt; `status`: `CaseStatuses` = CaseStatusRt; `tags`: `string`[] ; `title`: `string` = rt.string } & { `closed_at`: ``null`` \| `string` ; `closed_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `created_at`: `string` = rt.string; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } = UserRT; `external_service`: ``null`` \| { connector\_id: string; } & { connector\_name: string; external\_id: string; external\_title: string; external\_url: string; pushed\_at: string; pushed\_by: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| ... 1 more ... \| undefined; }; } = CaseFullExternalServiceRt; `updated_at`: ``null`` \| `string` ; `updated_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }  } & { `id`: `string` = rt.string; `totalAlerts`: `number` = rt.number; `totalComment`: `number` = rt.number; `version`: `string` = rt.string } & { `comments`: `undefined` \| { `comment`: `string` = rt.string; `owner`: `string` = rt.string; `type`: [`user`](../modules/client._internal_namespace.md#user)  } & { `created_at`: `string` = rt.string; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } = UserRT; `owner`: `string` = rt.string; `pushed_at`: ``null`` \| `string` ; `pushed_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `updated_at`: ``null`` \| `string` ; `updated_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }  } & { `id`: `string` = rt.string; `version`: `string` = rt.string } & { `alertId`: `string` \| `string`[] ; `index`: `string` \| `string`[] ; `owner`: `string` = rt.string; `rule`: { id: string \| null; name: string \| null; } ; `type`: [`alert`](../modules/client._internal_namespace.md#alert)  } & { `created_at`: `string` = rt.string; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } = UserRT; `owner`: `string` = rt.string; `pushed_at`: ``null`` \| `string` ; `pushed_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `updated_at`: ``null`` \| `string` ; `updated_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }  } & { `id`: `string` = rt.string; `version`: `string` = rt.string } & { `actions`: { targets: { hostname: string; endpointId: string; }[]; type: string; } ; `comment`: `string` = rt.string; `owner`: `string` = rt.string; `type`: [`actions`](../modules/client._internal_namespace.md#actions)  } & { `created_at`: `string` = rt.string; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } = UserRT; `owner`: `string` = rt.string; `pushed_at`: ``null`` \| `string` ; `pushed_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `updated_at`: ``null`` \| `string` ; `updated_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }  } & { `id`: `string` = rt.string; `version`: `string` = rt.string }[]  }\>

#### Defined in

[x-pack/plugins/cases/server/services/cases/index.ts:119](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/services/cases/index.ts#L119)

___

### page

• **page**: `number`

#### Defined in

[x-pack/plugins/cases/server/services/cases/index.ts:120](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/services/cases/index.ts#L120)

___

### perPage

• **perPage**: `number`

#### Defined in

[x-pack/plugins/cases/server/services/cases/index.ts:121](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/services/cases/index.ts#L121)

___

### total

• **total**: `number`

#### Defined in

[x-pack/plugins/cases/server/services/cases/index.ts:122](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/services/cases/index.ts#L122)
