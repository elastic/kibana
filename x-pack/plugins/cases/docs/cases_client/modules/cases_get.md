[Cases Client API Interface](../README.md) / cases/get

# Module: cases/get

## Table of contents

### Namespaces

- [\_internal\_namespace](cases_get._internal_namespace.md)

### Interfaces

- [CasesByAlertIDParams](../interfaces/cases_get.CasesByAlertIDParams.md)
- [GetParams](../interfaces/cases_get.GetParams.md)

### Functions

- [getReporters](cases_get.md#getreporters)
- [getTags](cases_get.md#gettags)
- [resolve](cases_get.md#resolve)

## Functions

### getReporters

▸ **getReporters**(`params`, `clientArgs`): `Promise`<[`User`](cases_get._internal_namespace.md#user)[]\>

Retrieves the reporters from all the cases.

#### Parameters

| Name | Type |
| :------ | :------ |
| `params` | `Object` |
| `params.owner` | `undefined` \| `string` \| `string`[] |
| `clientArgs` | [`CasesClientArgs`](../interfaces/client._internal_namespace.CasesClientArgs.md) |

#### Returns

`Promise`<[`User`](cases_get._internal_namespace.md#user)[]\>

#### Defined in

[x-pack/plugins/cases/server/client/cases/get.ts:301](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/client/cases/get.ts#L301)

___

### getTags

▸ **getTags**(`params`, `clientArgs`): `Promise`<`string`[]\>

Retrieves the tags from all the cases.

#### Parameters

| Name | Type |
| :------ | :------ |
| `params` | `Object` |
| `params.owner` | `undefined` \| `string` \| `string`[] |
| `clientArgs` | [`CasesClientArgs`](../interfaces/client._internal_namespace.CasesClientArgs.md) |

#### Returns

`Promise`<`string`[]\>

#### Defined in

[x-pack/plugins/cases/server/client/cases/get.ts:269](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/client/cases/get.ts#L269)

___

### resolve

▸ `Const` **resolve**(`__namedParameters`, `clientArgs`): `Promise`<{ `case`: { description: string; status: CaseStatuses; tags: string[]; title: string; connector: { id: string; } & (({ type: ConnectorTypes.jira; fields: { issueType: string \| null; priority: string \| null; parent: string \| null; } \| null; } & { ...; }) \| ... 4 more ... \| ({ ...; } & { ...; })); settings: { ...; }; owner: str... & { closed\_at: string \| null; closed\_by: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } \| null; created\_at: string; created\_by: { ...; }; external\_service: ({ ...; } & { ...; }) \| null; updated\_at: string \| null; updated\_by: { ...; } \| null; } & { id: string; totalComment: number; totalAlerts: number; version: string; } & { `comments`: `undefined` \| { comment: string; type: CommentType.user; owner: string; } & { created\_at: string; created\_by: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }; owner: string; pushed\_at: string \| null; pushed\_by: { ...; } \| null; updated\_at: string \| null; updated\_by: { ...; } \| null; } & { id: string; version: string; } & { type: CommentType.alert; alertId: string \| string[]; index: string \| string[]; rule: { id: string \| null; name: string \| null; }; owner: string; } & { created\_at: string; created\_by: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }; owner: string; pushed\_at: string \| null; pushed\_by: { ...; } \| null; updated\_at: string \| null; updated\_by: { ...; } \| null; } & { id: string; version: string; } & { type: CommentType.actions; comment: string; actions: { targets: { hostname: string; endpointId: string; }[]; type: string; }; owner: string; } & { created\_at: string; created\_by: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }; owner: string; pushed\_at: string \| null; pushed\_by: { ...; } \| null; updated\_at: string \| null; updated\_by: { ...; } \| null; } & { id: string; version: string; }[]  } = CaseResponseRt; `outcome`: ``"exactMatch"`` \| ``"aliasMatch"`` \| ``"conflict"``  } & { `alias_target_id`: `undefined` \| `string` = rt.string }\>

Retrieves a case resolving its ID and optionally loading its comments.

**`experimental`**

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [`GetParams`](../interfaces/cases_get.GetParams.md) |
| `clientArgs` | [`CasesClientArgs`](../interfaces/client._internal_namespace.CasesClientArgs.md) |

#### Returns

`Promise`<{ `case`: { description: string; status: CaseStatuses; tags: string[]; title: string; connector: { id: string; } & (({ type: ConnectorTypes.jira; fields: { issueType: string \| null; priority: string \| null; parent: string \| null; } \| null; } & { ...; }) \| ... 4 more ... \| ({ ...; } & { ...; })); settings: { ...; }; owner: str... & { closed\_at: string \| null; closed\_by: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } \| null; created\_at: string; created\_by: { ...; }; external\_service: ({ ...; } & { ...; }) \| null; updated\_at: string \| null; updated\_by: { ...; } \| null; } & { id: string; totalComment: number; totalAlerts: number; version: string; } & { `comments`: `undefined` \| { comment: string; type: CommentType.user; owner: string; } & { created\_at: string; created\_by: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }; owner: string; pushed\_at: string \| null; pushed\_by: { ...; } \| null; updated\_at: string \| null; updated\_by: { ...; } \| null; } & { id: string; version: string; } & { type: CommentType.alert; alertId: string \| string[]; index: string \| string[]; rule: { id: string \| null; name: string \| null; }; owner: string; } & { created\_at: string; created\_by: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }; owner: string; pushed\_at: string \| null; pushed\_by: { ...; } \| null; updated\_at: string \| null; updated\_by: { ...; } \| null; } & { id: string; version: string; } & { type: CommentType.actions; comment: string; actions: { targets: { hostname: string; endpointId: string; }[]; type: string; }; owner: string; } & { created\_at: string; created\_by: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }; owner: string; pushed\_at: string \| null; pushed\_by: { ...; } \| null; updated\_at: string \| null; updated\_by: { ...; } \| null; } & { id: string; version: string; }[]  } = CaseResponseRt; `outcome`: ``"exactMatch"`` \| ``"aliasMatch"`` \| ``"conflict"``  } & { `alias_target_id`: `undefined` \| `string` = rt.string }\>

#### Defined in

[x-pack/plugins/cases/server/client/cases/get.ts:208](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/client/cases/get.ts#L208)
