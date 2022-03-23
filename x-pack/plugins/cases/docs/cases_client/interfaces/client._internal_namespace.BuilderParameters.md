[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_internal\_namespace](../modules/client._internal_namespace.md) / BuilderParameters

# Interface: BuilderParameters

[client](../modules/client.md).[_internal_namespace](../modules/client._internal_namespace.md).BuilderParameters

## Table of contents

### Properties

- [comment](client._internal_namespace.BuilderParameters.md#comment)
- [connector](client._internal_namespace.BuilderParameters.md#connector)
- [create\_case](client._internal_namespace.BuilderParameters.md#create_case)
- [delete\_case](client._internal_namespace.BuilderParameters.md#delete_case)
- [description](client._internal_namespace.BuilderParameters.md#description)
- [pushed](client._internal_namespace.BuilderParameters.md#pushed)
- [settings](client._internal_namespace.BuilderParameters.md#settings)
- [status](client._internal_namespace.BuilderParameters.md#status)
- [tags](client._internal_namespace.BuilderParameters.md#tags)
- [title](client._internal_namespace.BuilderParameters.md#title)

## Properties

### comment

• **comment**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `parameters` | `Object` |
| `parameters.payload` | `Object` |
| `parameters.payload.attachment` | { `comment`: `string` = rt.string; `owner`: `string` = rt.string; `type`: [`user`](../modules/client._internal_namespace.md#user)  } \| { `alertId`: `string` \| `string`[] ; `index`: `string` \| `string`[] ; `owner`: `string` = rt.string; `rule`: { id: string \| null; name: string \| null; } ; `type`: [`alert`](../modules/client._internal_namespace.md#alert)  } \| { `actions`: { targets: { hostname: string; endpointId: string; }[]; type: string; } ; `comment`: `string` = rt.string; `owner`: `string` = rt.string; `type`: [`actions`](../modules/client._internal_namespace.md#actions)  } |

#### Defined in

[x-pack/plugins/cases/server/services/user_actions/types.ts:44](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/services/user_actions/types.ts#L44)

___

### connector

• **connector**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `parameters` | `Object` |
| `parameters.payload` | `Object` |
| `parameters.payload.connector` | { `id`: `string` = rt.string } & { `fields`: ``null`` \| { issueType: string \| null; priority: string \| null; parent: string \| null; } ; `type`: [`jira`](../modules/client._internal_namespace.md#jira)  } & { `name`: `string` = rt.string } & { `id`: `string` = rt.string } & { `fields`: ``null`` = rt.null; `type`: [`none`](../modules/client._internal_namespace.md#none)  } & { `name`: `string` = rt.string } & { `id`: `string` = rt.string } & { `fields`: ``null`` \| { incidentTypes: string[] \| null; severityCode: string \| null; } ; `type`: [`resilient`](../modules/client._internal_namespace.md#resilient)  } & { `name`: `string` = rt.string } & { `id`: `string` = rt.string } & { `fields`: ``null`` \| { impact: string \| null; severity: string \| null; urgency: string \| null; category: string \| null; subcategory: string \| null; } ; `type`: [`serviceNowITSM`](../modules/client._internal_namespace.md#servicenowitsm)  } & { `name`: `string` = rt.string } & { `id`: `string` = rt.string } & { `fields`: ``null`` \| { category: string \| null; destIp: boolean \| null; malwareHash: boolean \| null; malwareUrl: boolean \| null; priority: string \| null; sourceIp: boolean \| null; subcategory: string \| null; } ; `type`: [`serviceNowSIR`](../modules/client._internal_namespace.md#servicenowsir)  } & { `name`: `string` = rt.string } & { `id`: `string` = rt.string } & { `fields`: ``null`` \| { caseId: string \| null; } ; `type`: [`swimlane`](../modules/client._internal_namespace.md#swimlane)  } & { `name`: `string` = rt.string } |

#### Defined in

[x-pack/plugins/cases/server/services/user_actions/types.ts:49](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/services/user_actions/types.ts#L49)

___

### create\_case

• **create\_case**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `parameters` | `Object` |
| `parameters.payload` | `Object` |
| `parameters.payload.connector` | { id: string; } & { type: ConnectorTypes.jira; fields: { issueType: string \| null; priority: string \| null; parent: string \| null; } \| null; } & { name: string; } & { id: string; } & { type: ConnectorTypes.none; fields: null; } & { name: string; } & { id: string; } & { type: ConnectorTypes.resilient; fields: { incidentTypes: string[] \| null; severityCode: string \| null; } \| null; } & { name: string; } & { id: string; } & { type: ConnectorTypes.serviceNowITSM; fields: { impact: string \| null; severity: string \| null; urgency: string \| null; category: string \| null; subcategory: string \| null; } \| null; } & { name: string; } & { id: string; } & { type: ConnectorTypes.serviceNowSIR; fields: { category: string \| null; destIp: boolean \| null; malwareHash: boolean \| null; malwareUrl: boolean \| null; priority: string \| null; sourceIp: boolean \| null; subcategory: string \| null; } \| null; } & { name: string; } & { id: string; } & { type: ConnectorTypes.swimlane; fields: { caseId: string \| null; } \| null; } & { name: string; } |
| `parameters.payload.description` | `string` |
| `parameters.payload.owner` | `string` |
| `parameters.payload.settings` | { syncAlerts: boolean; } |
| `parameters.payload.tags` | `string`[] |
| `parameters.payload.title` | `string` |

#### Defined in

[x-pack/plugins/cases/server/services/user_actions/types.ts:56](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/services/user_actions/types.ts#L56)

___

### delete\_case

• **delete\_case**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `parameters` | `Object` |
| `parameters.payload` | `Object` |

#### Defined in

[x-pack/plugins/cases/server/services/user_actions/types.ts:61](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/services/user_actions/types.ts#L61)

___

### description

• **description**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `parameters` | `Object` |
| `parameters.payload` | `Object` |
| `parameters.payload.description` | `string` |

#### Defined in

[x-pack/plugins/cases/server/services/user_actions/types.ts:25](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/services/user_actions/types.ts#L25)

___

### pushed

• **pushed**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `parameters` | `Object` |
| `parameters.payload` | `Object` |
| `parameters.payload.externalService` | { `connector_id`: `string` = rt.string } & { `connector_name`: `string` = rt.string; `external_id`: `string` = rt.string; `external_title`: `string` = rt.string; `external_url`: `string` = rt.string; `pushed_at`: `string` = rt.string; `pushed_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } = UserRT } |

#### Defined in

[x-pack/plugins/cases/server/services/user_actions/types.ts:34](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/services/user_actions/types.ts#L34)

___

### settings

• **settings**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `parameters` | `Object` |
| `parameters.payload` | `Object` |
| `parameters.payload.settings` | `Object` |
| `parameters.payload.settings.syncAlerts` | `boolean` |

#### Defined in

[x-pack/plugins/cases/server/services/user_actions/types.ts:41](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/services/user_actions/types.ts#L41)

___

### status

• **status**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `parameters` | `Object` |
| `parameters.payload` | `Object` |
| `parameters.payload.status` | [`CaseStatuses`](../enums/client._internal_namespace.CaseStatuses.md) |

#### Defined in

[x-pack/plugins/cases/server/services/user_actions/types.ts:28](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/services/user_actions/types.ts#L28)

___

### tags

• **tags**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `parameters` | `Object` |
| `parameters.payload` | `Object` |
| `parameters.payload.tags` | `string`[] |

#### Defined in

[x-pack/plugins/cases/server/services/user_actions/types.ts:31](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/services/user_actions/types.ts#L31)

___

### title

• **title**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `parameters` | `Object` |
| `parameters.payload` | `Object` |
| `parameters.payload.title` | `string` |

#### Defined in

[x-pack/plugins/cases/server/services/user_actions/types.ts:22](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/services/user_actions/types.ts#L22)
