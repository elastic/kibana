[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_internal\_namespace](../modules/client._internal_namespace.md) / PostCaseConfigureArgs

# Interface: PostCaseConfigureArgs

[client](../modules/client.md).[_internal_namespace](../modules/client._internal_namespace.md).PostCaseConfigureArgs

## Hierarchy

- [`ClientArgs`](client._internal_namespace.ClientArgs.md)

  ↳ **`PostCaseConfigureArgs`**

## Table of contents

### Properties

- [attributes](client._internal_namespace.PostCaseConfigureArgs.md#attributes)
- [id](client._internal_namespace.PostCaseConfigureArgs.md#id)
- [unsecuredSavedObjectsClient](client._internal_namespace.PostCaseConfigureArgs.md#unsecuredsavedobjectsclient)

## Properties

### attributes

• **attributes**: { `closure_type`: ``"close-by-user"`` \| ``"close-by-pushing"`` = ClosureTypeRT; `connector`: { id: string; } & { type: ConnectorTypes.jira; fields: { issueType: string \| null; priority: string \| null; parent: string \| null; } \| null; } & { name: string; } & { id: string; } & { type: ConnectorTypes.none; fields: null; } & { name: string; } & { id: string; } & { type: ConnectorTypes.resilient; fields: { incidentTypes: string[] \| null; severityCode: string \| null; } \| null; } & { name: string; } & { id: string; } & { type: ConnectorTypes.serviceNowITSM; fields: { impact: string \| null; severity: string \| null; urgency: string \| null; category: string \| null; subcategory: string \| null; } \| null; } & { name: string; } & { id: string; } & { type: ConnectorTypes.serviceNowSIR; fields: { category: string \| null; destIp: boolean \| null; malwareHash: boolean \| null; malwareUrl: boolean \| null; priority: string \| null; sourceIp: boolean \| null; subcategory: string \| null; } \| null; } & { name: string; } & { id: string; } & { type: ConnectorTypes.swimlane; fields: { caseId: string \| null; } \| null; } & { name: string; } = CaseConnectorRt } & { `owner`: `string` = rt.string } & { `created_at`: `string` = rt.string; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } = UserRT; `updated_at`: ``null`` \| `string` ; `updated_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }  }

#### Defined in

[x-pack/plugins/cases/server/services/configure/index.ts:41](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/services/configure/index.ts#L41)

___

### id

• **id**: `string`

#### Defined in

[x-pack/plugins/cases/server/services/configure/index.ts:42](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/services/configure/index.ts#L42)

___

### unsecuredSavedObjectsClient

• **unsecuredSavedObjectsClient**: [`SavedObjectsClientContract`](../modules/client._internal_namespace.md#savedobjectsclientcontract)

#### Inherited from

[ClientArgs](client._internal_namespace.ClientArgs.md).[unsecuredSavedObjectsClient](client._internal_namespace.ClientArgs.md#unsecuredsavedobjectsclient)

#### Defined in

[x-pack/plugins/cases/server/services/configure/index.ts:30](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/services/configure/index.ts#L30)
