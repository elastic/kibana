[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_internal\_namespace](../modules/client._internal_namespace.md) / PatchCaseConfigureArgs

# Interface: PatchCaseConfigureArgs

[client](../modules/client.md).[_internal_namespace](../modules/client._internal_namespace.md).PatchCaseConfigureArgs

## Hierarchy

- [`ClientArgs`](client._internal_namespace.ClientArgs.md)

  ↳ **`PatchCaseConfigureArgs`**

## Table of contents

### Properties

- [configurationId](client._internal_namespace.PatchCaseConfigureArgs.md#configurationid)
- [originalConfiguration](client._internal_namespace.PatchCaseConfigureArgs.md#originalconfiguration)
- [unsecuredSavedObjectsClient](client._internal_namespace.PatchCaseConfigureArgs.md#unsecuredsavedobjectsclient)
- [updatedAttributes](client._internal_namespace.PatchCaseConfigureArgs.md#updatedattributes)

## Properties

### configurationId

• **configurationId**: `string`

#### Defined in

[x-pack/plugins/cases/server/services/configure/index.ts:46](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/services/configure/index.ts#L46)

___

### originalConfiguration

• **originalConfiguration**: [`SavedObject`](client._internal_namespace.SavedObject.md)<{ `closure_type`: ``"close-by-user"`` \| ``"close-by-pushing"`` = ClosureTypeRT; `connector`: { id: string; } & { type: ConnectorTypes.jira; fields: { issueType: string \| null; priority: string \| null; parent: string \| null; } \| null; } & { name: string; } & { id: string; } & { type: ConnectorTypes.none; fields: null; } & { name: string; } & { id: string; } & { type: ConnectorTypes.resilient; fields: { incidentTypes: string[] \| null; severityCode: string \| null; } \| null; } & { name: string; } & { id: string; } & { type: ConnectorTypes.serviceNowITSM; fields: { impact: string \| null; severity: string \| null; urgency: string \| null; category: string \| null; subcategory: string \| null; } \| null; } & { name: string; } & { id: string; } & { type: ConnectorTypes.serviceNowSIR; fields: { category: string \| null; destIp: boolean \| null; malwareHash: boolean \| null; malwareUrl: boolean \| null; priority: string \| null; sourceIp: boolean \| null; subcategory: string \| null; } \| null; } & { name: string; } & { id: string; } & { type: ConnectorTypes.swimlane; fields: { caseId: string \| null; } \| null; } & { name: string; } = CaseConnectorRt } & { `owner`: `string` = rt.string } & { `created_at`: `string` = rt.string; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } = UserRT; `updated_at`: ``null`` \| `string` ; `updated_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }  }\>

#### Defined in

[x-pack/plugins/cases/server/services/configure/index.ts:48](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/services/configure/index.ts#L48)

___

### unsecuredSavedObjectsClient

• **unsecuredSavedObjectsClient**: [`SavedObjectsClientContract`](../modules/client._internal_namespace.md#savedobjectsclientcontract)

#### Inherited from

[ClientArgs](client._internal_namespace.ClientArgs.md).[unsecuredSavedObjectsClient](client._internal_namespace.ClientArgs.md#unsecuredsavedobjectsclient)

#### Defined in

[x-pack/plugins/cases/server/services/configure/index.ts:30](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/services/configure/index.ts#L30)

___

### updatedAttributes

• **updatedAttributes**: `Partial`<{ `closure_type`: ``"close-by-user"`` \| ``"close-by-pushing"`` = ClosureTypeRT; `connector`: { id: string; } & { type: ConnectorTypes.jira; fields: { issueType: string \| null; priority: string \| null; parent: string \| null; } \| null; } & { name: string; } & { id: string; } & { type: ConnectorTypes.none; fields: null; } & { name: string; } & { id: string; } & { type: ConnectorTypes.resilient; fields: { incidentTypes: string[] \| null; severityCode: string \| null; } \| null; } & { name: string; } & { id: string; } & { type: ConnectorTypes.serviceNowITSM; fields: { impact: string \| null; severity: string \| null; urgency: string \| null; category: string \| null; subcategory: string \| null; } \| null; } & { name: string; } & { id: string; } & { type: ConnectorTypes.serviceNowSIR; fields: { category: string \| null; destIp: boolean \| null; malwareHash: boolean \| null; malwareUrl: boolean \| null; priority: string \| null; sourceIp: boolean \| null; subcategory: string \| null; } \| null; } & { name: string; } & { id: string; } & { type: ConnectorTypes.swimlane; fields: { caseId: string \| null; } \| null; } & { name: string; } = CaseConnectorRt } & { `owner`: `string` = rt.string } & { `created_at`: `string` = rt.string; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } = UserRT; `updated_at`: ``null`` \| `string` ; `updated_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }  }\>

#### Defined in

[x-pack/plugins/cases/server/services/configure/index.ts:47](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/services/configure/index.ts#L47)
