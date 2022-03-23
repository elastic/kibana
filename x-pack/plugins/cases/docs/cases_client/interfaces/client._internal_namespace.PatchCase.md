[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_internal\_namespace](../modules/client._internal_namespace.md) / PatchCase

# Interface: PatchCase

[client](../modules/client.md).[_internal_namespace](../modules/client._internal_namespace.md).PatchCase

## Table of contents

### Properties

- [caseId](client._internal_namespace.PatchCase.md#caseid)
- [originalCase](client._internal_namespace.PatchCase.md#originalcase)
- [updatedAttributes](client._internal_namespace.PatchCase.md#updatedattributes)
- [version](client._internal_namespace.PatchCase.md#version)

## Properties

### caseId

• **caseId**: `string`

#### Defined in

[x-pack/plugins/cases/server/services/cases/index.ts:98](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/services/cases/index.ts#L98)

___

### originalCase

• **originalCase**: [`SavedObject`](client._internal_namespace.SavedObject.md)<{ `connector`: { id: string; } & { type: ConnectorTypes.jira; fields: { issueType: string \| null; priority: string \| null; parent: string \| null; } \| null; } & { name: string; } & { id: string; } & { type: ConnectorTypes.none; fields: null; } & { name: string; } & { id: string; } & { type: ConnectorTypes.resilient; fields: { incidentTypes: string[] \| null; severityCode: string \| null; } \| null; } & { name: string; } & { id: string; } & { type: ConnectorTypes.serviceNowITSM; fields: { impact: string \| null; severity: string \| null; urgency: string \| null; category: string \| null; subcategory: string \| null; } \| null; } & { name: string; } & { id: string; } & { type: ConnectorTypes.serviceNowSIR; fields: { category: string \| null; destIp: boolean \| null; malwareHash: boolean \| null; malwareUrl: boolean \| null; priority: string \| null; sourceIp: boolean \| null; subcategory: string \| null; } \| null; } & { name: string; } & { id: string; } & { type: ConnectorTypes.swimlane; fields: { caseId: string \| null; } \| null; } & { name: string; } = CaseConnectorRt; `description`: `string` = rt.string; `owner`: `string` = rt.string; `settings`: { syncAlerts: boolean; } = SettingsRt; `status`: `CaseStatuses` = CaseStatusRt; `tags`: `string`[] ; `title`: `string` = rt.string } & { `closed_at`: ``null`` \| `string` ; `closed_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `created_at`: `string` = rt.string; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } = UserRT; `external_service`: ``null`` \| { connector\_id: string; } & { connector\_name: string; external\_id: string; external\_title: string; external\_url: string; pushed\_at: string; pushed\_by: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| ... 1 more ... \| undefined; }; } = CaseFullExternalServiceRt; `updated_at`: ``null`` \| `string` ; `updated_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }  }\>

#### Defined in

[x-pack/plugins/cases/server/services/cases/index.ts:100](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/services/cases/index.ts#L100)

___

### updatedAttributes

• **updatedAttributes**: `Partial`<{ `connector`: { id: string; } & { type: ConnectorTypes.jira; fields: { issueType: string \| null; priority: string \| null; parent: string \| null; } \| null; } & { name: string; } & { id: string; } & { type: ConnectorTypes.none; fields: null; } & { name: string; } & { id: string; } & { type: ConnectorTypes.resilient; fields: { incidentTypes: string[] \| null; severityCode: string \| null; } \| null; } & { name: string; } & { id: string; } & { type: ConnectorTypes.serviceNowITSM; fields: { impact: string \| null; severity: string \| null; urgency: string \| null; category: string \| null; subcategory: string \| null; } \| null; } & { name: string; } & { id: string; } & { type: ConnectorTypes.serviceNowSIR; fields: { category: string \| null; destIp: boolean \| null; malwareHash: boolean \| null; malwareUrl: boolean \| null; priority: string \| null; sourceIp: boolean \| null; subcategory: string \| null; } \| null; } & { name: string; } & { id: string; } & { type: ConnectorTypes.swimlane; fields: { caseId: string \| null; } \| null; } & { name: string; } = CaseConnectorRt; `description`: `string` = rt.string; `owner`: `string` = rt.string; `settings`: { syncAlerts: boolean; } = SettingsRt; `status`: `CaseStatuses` = CaseStatusRt; `tags`: `string`[] ; `title`: `string` = rt.string } & { `closed_at`: ``null`` \| `string` ; `closed_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `created_at`: `string` = rt.string; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } = UserRT; `external_service`: ``null`` \| { connector\_id: string; } & { connector\_name: string; external\_id: string; external\_title: string; external\_url: string; pushed\_at: string; pushed\_by: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| ... 1 more ... \| undefined; }; } = CaseFullExternalServiceRt; `updated_at`: ``null`` \| `string` ; `updated_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }  } & [`PushedArgs`](client._internal_namespace.PushedArgs.md)\>

#### Defined in

[x-pack/plugins/cases/server/services/cases/index.ts:99](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/services/cases/index.ts#L99)

___

### version

• `Optional` **version**: `string`

#### Defined in

[x-pack/plugins/cases/server/services/cases/index.ts:101](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/services/cases/index.ts#L101)
