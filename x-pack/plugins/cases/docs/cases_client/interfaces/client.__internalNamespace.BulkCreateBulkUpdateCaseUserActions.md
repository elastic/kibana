[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_\_internalNamespace](../modules/client.__internalNamespace.md) / BulkCreateBulkUpdateCaseUserActions

# Interface: BulkCreateBulkUpdateCaseUserActions

[client](../modules/client.md).[__internalNamespace](../modules/client.__internalNamespace.md).BulkCreateBulkUpdateCaseUserActions

## Hierarchy

- [`ClientArgs`](client.__internalNamespace.ClientArgs-1.md)

  ↳ **`BulkCreateBulkUpdateCaseUserActions`**

## Table of contents

### Properties

- [originalCases](client.__internalNamespace.BulkCreateBulkUpdateCaseUserActions.md#originalcases)
- [unsecuredSavedObjectsClient](client.__internalNamespace.BulkCreateBulkUpdateCaseUserActions.md#unsecuredsavedobjectsclient)
- [updatedCases](client.__internalNamespace.BulkCreateBulkUpdateCaseUserActions.md#updatedcases)
- [user](client.__internalNamespace.BulkCreateBulkUpdateCaseUserActions.md#user)

## Properties

### originalCases

• **originalCases**: [`SavedObject`](client.__internalNamespace.SavedObject.md)<{ `connector`: { id: string; } & { type: ConnectorTypes.jira; fields: { issueType: string \| null; priority: string \| null; parent: string \| null; } \| null; } & { name: string; } & { id: string; } & { type: ConnectorTypes.none; fields: null; } & { name: string; } & { id: string; } & { type: ConnectorTypes.resilient; fields: { incidentTypes: string[] \| null; severityCode: string \| null; } \| null; } & { name: string; } & { id: string; } & { type: ConnectorTypes.serviceNowITSM; fields: { impact: string \| null; severity: string \| null; urgency: string \| null; category: string \| null; subcategory: string \| null; } \| null; } & { name: string; } & { id: string; } & { type: ConnectorTypes.serviceNowSIR; fields: { category: string \| null; destIp: boolean \| null; malwareHash: boolean \| null; malwareUrl: boolean \| null; priority: string \| null; sourceIp: boolean \| null; subcategory: string \| null; } \| null; } & { name: string; } & { id: string; } & { type: ConnectorTypes.swimlane; fields: { caseId: string \| null; } \| null; } & { name: string; } = CaseConnectorRt; `description`: `string` = rt.string; `owner`: `string` = rt.string; `settings`: { syncAlerts: boolean; } = SettingsRt; `status`: `CaseStatuses` = CaseStatusRt; `tags`: `string`[] ; `title`: `string` = rt.string } & { `closed_at`: ``null`` \| `string` ; `closed_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `created_at`: `string` = rt.string; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } = UserRT; `external_service`: ``null`` \| { connector\_id: string; } & { connector\_name: string; external\_id: string; external\_title: string; external\_url: string; pushed\_at: string; pushed\_by: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| ... 1 more ... \| undefined; }; } = CaseFullExternalServiceRt; `updated_at`: ``null`` \| `string` ; `updated_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }  }\>[]

#### Defined in

[x-pack/plugins/cases/server/services/user_actions/index.ts:89](https://github.com/elastic/kibana/blob/06b0f975f60/x-pack/plugins/cases/server/services/user_actions/index.ts#L89)

___

### unsecuredSavedObjectsClient

• **unsecuredSavedObjectsClient**: [`SavedObjectsClientContract`](../modules/client.__internalNamespace.md#savedobjectsclientcontract)

#### Inherited from

[ClientArgs](client.__internalNamespace.ClientArgs-1.md).[unsecuredSavedObjectsClient](client.__internalNamespace.ClientArgs-1.md#unsecuredsavedobjectsclient)

#### Defined in

[x-pack/plugins/cases/server/services/index.ts:19](https://github.com/elastic/kibana/blob/06b0f975f60/x-pack/plugins/cases/server/services/index.ts#L19)

___

### updatedCases

• **updatedCases**: [`SavedObjectsUpdateResponse`](client.__internalNamespace.SavedObjectsUpdateResponse.md)<{ `connector`: { id: string; } & { type: ConnectorTypes.jira; fields: { issueType: string \| null; priority: string \| null; parent: string \| null; } \| null; } & { name: string; } & { id: string; } & { type: ConnectorTypes.none; fields: null; } & { name: string; } & { id: string; } & { type: ConnectorTypes.resilient; fields: { incidentTypes: string[] \| null; severityCode: string \| null; } \| null; } & { name: string; } & { id: string; } & { type: ConnectorTypes.serviceNowITSM; fields: { impact: string \| null; severity: string \| null; urgency: string \| null; category: string \| null; subcategory: string \| null; } \| null; } & { name: string; } & { id: string; } & { type: ConnectorTypes.serviceNowSIR; fields: { category: string \| null; destIp: boolean \| null; malwareHash: boolean \| null; malwareUrl: boolean \| null; priority: string \| null; sourceIp: boolean \| null; subcategory: string \| null; } \| null; } & { name: string; } & { id: string; } & { type: ConnectorTypes.swimlane; fields: { caseId: string \| null; } \| null; } & { name: string; } = CaseConnectorRt; `description`: `string` = rt.string; `owner`: `string` = rt.string; `settings`: { syncAlerts: boolean; } = SettingsRt; `status`: `CaseStatuses` = CaseStatusRt; `tags`: `string`[] ; `title`: `string` = rt.string } & { `closed_at`: ``null`` \| `string` ; `closed_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `created_at`: `string` = rt.string; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } = UserRT; `external_service`: ``null`` \| { connector\_id: string; } & { connector\_name: string; external\_id: string; external\_title: string; external\_url: string; pushed\_at: string; pushed\_by: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| ... 1 more ... \| undefined; }; } = CaseFullExternalServiceRt; `updated_at`: ``null`` \| `string` ; `updated_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }  }\>[]

#### Defined in

[x-pack/plugins/cases/server/services/user_actions/index.ts:90](https://github.com/elastic/kibana/blob/06b0f975f60/x-pack/plugins/cases/server/services/user_actions/index.ts#L90)

___

### user

• **user**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `email` | `undefined` \| ``null`` \| `string` |
| `full_name` | `undefined` \| ``null`` \| `string` |
| `username` | `undefined` \| ``null`` \| `string` |

#### Defined in

[x-pack/plugins/cases/server/services/user_actions/index.ts:91](https://github.com/elastic/kibana/blob/06b0f975f60/x-pack/plugins/cases/server/services/user_actions/index.ts#L91)
