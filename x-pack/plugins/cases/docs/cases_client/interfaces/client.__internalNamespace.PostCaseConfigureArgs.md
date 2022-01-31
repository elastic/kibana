[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_\_internalNamespace](../modules/client.__internalNamespace.md) / PostCaseConfigureArgs

# Interface: PostCaseConfigureArgs

[client](../modules/client.md).[__internalNamespace](../modules/client.__internalNamespace.md).PostCaseConfigureArgs

## Hierarchy

- [`ClientArgs`](client.__internalNamespace.ClientArgs.md)

  ↳ **`PostCaseConfigureArgs`**

## Table of contents

### Properties

- [attributes](client.__internalNamespace.PostCaseConfigureArgs.md#attributes)
- [id](client.__internalNamespace.PostCaseConfigureArgs.md#id)
- [unsecuredSavedObjectsClient](client.__internalNamespace.PostCaseConfigureArgs.md#unsecuredsavedobjectsclient)

## Properties

### attributes

• **attributes**: { `closure_type`: ``"close-by-user"`` \| ``"close-by-pushing"`` = ClosureTypeRT; `connector`: { id: string; } & { type: ConnectorTypes.jira; fields: { issueType: string \| null; priority: string \| null; parent: string \| null; } \| null; } & { name: string; } & { id: string; } & { type: ConnectorTypes.none; fields: null; } & { name: string; } & { id: string; } & { type: ConnectorTypes.resilient; fields: { incidentTypes: string[] \| null; severityCode: string \| null; } \| null; } & { name: string; } & { id: string; } & { type: ConnectorTypes.serviceNowITSM; fields: { impact: string \| null; severity: string \| null; urgency: string \| null; category: string \| null; subcategory: string \| null; } \| null; } & { name: string; } & { id: string; } & { type: ConnectorTypes.serviceNowSIR; fields: { category: string \| null; destIp: boolean \| null; malwareHash: boolean \| null; malwareUrl: boolean \| null; priority: string \| null; sourceIp: boolean \| null; subcategory: string \| null; } \| null; } & { name: string; } & { id: string; } & { type: ConnectorTypes.swimlane; fields: { caseId: string \| null; } \| null; } & { name: string; } = CaseConnectorRt } & { `owner`: `string` = rt.string } & { `created_at`: `string` = rt.string; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } = UserRT; `updated_at`: ``null`` \| `string` ; `updated_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }  }

#### Defined in

[x-pack/plugins/cases/server/services/configure/index.ts:41](https://github.com/elastic/kibana/blob/06b0f975f60/x-pack/plugins/cases/server/services/configure/index.ts#L41)

___

### id

• **id**: `string`

#### Defined in

[x-pack/plugins/cases/server/services/configure/index.ts:42](https://github.com/elastic/kibana/blob/06b0f975f60/x-pack/plugins/cases/server/services/configure/index.ts#L42)

___

### unsecuredSavedObjectsClient

• **unsecuredSavedObjectsClient**: [`SavedObjectsClientContract`](../modules/client.__internalNamespace.md#savedobjectsclientcontract)

#### Inherited from

[ClientArgs](client.__internalNamespace.ClientArgs.md).[unsecuredSavedObjectsClient](client.__internalNamespace.ClientArgs.md#unsecuredsavedobjectsclient)

#### Defined in

[x-pack/plugins/cases/server/services/configure/index.ts:30](https://github.com/elastic/kibana/blob/06b0f975f60/x-pack/plugins/cases/server/services/configure/index.ts#L30)
