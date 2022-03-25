[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_internal\_namespace](../modules/client._internal_namespace.md) / CasesService

# Class: CasesService

[client](../modules/client.md).[_internal_namespace](../modules/client._internal_namespace.md).CasesService

## Table of contents

### Constructors

- [constructor](client._internal_namespace.CasesService.md#constructor)

### Methods

- [asArray](client._internal_namespace.CasesService.md#asarray)
- [buildCaseIdsAggs](client._internal_namespace.CasesService.md#buildcaseidsaggs)
- [deleteCase](client._internal_namespace.CasesService.md#deletecase)
- [findCaseStatusStats](client._internal_namespace.CasesService.md#findcasestatusstats)
- [findCases](client._internal_namespace.CasesService.md#findcases)
- [findCasesGroupedByID](client._internal_namespace.CasesService.md#findcasesgroupedbyid)
- [getAllCaseComments](client._internal_namespace.CasesService.md#getallcasecomments)
- [getAllComments](client._internal_namespace.CasesService.md#getallcomments)
- [getCase](client._internal_namespace.CasesService.md#getcase)
- [getCaseCommentStats](client._internal_namespace.CasesService.md#getcasecommentstats)
- [getCaseIdsByAlertId](client._internal_namespace.CasesService.md#getcaseidsbyalertid)
- [getCases](client._internal_namespace.CasesService.md#getcases)
- [getReporters](client._internal_namespace.CasesService.md#getreporters)
- [getResolveCase](client._internal_namespace.CasesService.md#getresolvecase)
- [getTags](client._internal_namespace.CasesService.md#gettags)
- [getUser](client._internal_namespace.CasesService.md#getuser)
- [patchCase](client._internal_namespace.CasesService.md#patchcase)
- [patchCases](client._internal_namespace.CasesService.md#patchcases)
- [postNewCase](client._internal_namespace.CasesService.md#postnewcase)
- [getCaseIDsFromAlertAggs](client._internal_namespace.CasesService.md#getcaseidsfromalertaggs)

## Constructors

### constructor

• **new CasesService**(`log`, `authentication?`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `log` | `Logger` |
| `authentication?` | `Object` |
| `authentication.getCurrentUser` | (`request`: [`KibanaRequest`](client._internal_namespace.KibanaRequest.md)<`unknown`, `unknown`, `unknown`, `any`\>) => ``null`` \| [`AuthenticatedUser`](../interfaces/client._internal_namespace.AuthenticatedUser.md) |

#### Defined in

[x-pack/plugins/cases/server/services/cases/index.ts:138](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/services/cases/index.ts#L138)

## Methods

### asArray

▸ `Private` **asArray**(`id`): `string`[]

#### Parameters

| Name | Type |
| :------ | :------ |
| `id` | `undefined` \| `string` \| `string`[] |

#### Returns

`string`[]

#### Defined in

[x-pack/plugins/cases/server/services/cases/index.ts:413](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/services/cases/index.ts#L413)

___

### buildCaseIdsAggs

▸ `Private` **buildCaseIdsAggs**(`size?`): `Record`<`string`, `AggregationsAggregationContainer`\>

#### Parameters

| Name | Type | Default value |
| :------ | :------ | :------ |
| `size` | `number` | `100` |

#### Returns

`Record`<`string`, `AggregationsAggregationContainer`\>

#### Defined in

[x-pack/plugins/cases/server/services/cases/index.ts:143](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/services/cases/index.ts#L143)

___

### deleteCase

▸ **deleteCase**(`__namedParameters`): `Promise`<{}\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [`GetCaseArgs`](../interfaces/client._internal_namespace.GetCaseArgs.md) |

#### Returns

`Promise`<{}\>

#### Defined in

[x-pack/plugins/cases/server/services/cases/index.ts:332](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/services/cases/index.ts#L332)

___

### findCaseStatusStats

▸ **findCaseStatusStats**(`__namedParameters`): `Promise`<`number`\>

Retrieves the number of cases that exist with a given status (open, closed, etc).

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | `Object` |
| `__namedParameters.caseOptions` | [`SavedObjectFindOptionsKueryNode`](../modules/client._internal_namespace.md#savedobjectfindoptionskuerynode) |
| `__namedParameters.ensureSavedObjectsAreAuthorized` | [`EnsureSOAuthCallback`](../modules/client._internal_namespace.md#ensuresoauthcallback) |
| `__namedParameters.unsecuredSavedObjectsClient` | [`SavedObjectsClientContract`](../modules/client._internal_namespace.md#savedobjectsclientcontract) |

#### Returns

`Promise`<`number`\>

#### Defined in

[x-pack/plugins/cases/server/services/cases/index.ts:251](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/services/cases/index.ts#L251)

___

### findCases

▸ **findCases**(`__namedParameters`): `Promise`<[`SavedObjectsFindResponse`](../interfaces/client._internal_namespace.SavedObjectsFindResponse.md)<{ `connector`: { id: string; } & { type: ConnectorTypes.jira; fields: { issueType: string \| null; priority: string \| null; parent: string \| null; } \| null; } & { name: string; } & { id: string; } & { type: ConnectorTypes.none; fields: null; } & { name: string; } & { id: string; } & { type: ConnectorTypes.resilient; fields: { incidentTypes: string[] \| null; severityCode: string \| null; } \| null; } & { name: string; } & { id: string; } & { type: ConnectorTypes.serviceNowITSM; fields: { impact: string \| null; severity: string \| null; urgency: string \| null; category: string \| null; subcategory: string \| null; } \| null; } & { name: string; } & { id: string; } & { type: ConnectorTypes.serviceNowSIR; fields: { category: string \| null; destIp: boolean \| null; malwareHash: boolean \| null; malwareUrl: boolean \| null; priority: string \| null; sourceIp: boolean \| null; subcategory: string \| null; } \| null; } & { name: string; } & { id: string; } & { type: ConnectorTypes.swimlane; fields: { caseId: string \| null; } \| null; } & { name: string; } = CaseConnectorRt; `description`: `string` = rt.string; `owner`: `string` = rt.string; `settings`: { syncAlerts: boolean; } = SettingsRt; `status`: `CaseStatuses` = CaseStatusRt; `tags`: `string`[] ; `title`: `string` = rt.string } & { `closed_at`: ``null`` \| `string` ; `closed_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `created_at`: `string` = rt.string; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } = UserRT; `external_service`: ``null`` \| { connector\_id: string; } & { connector\_name: string; external\_id: string; external\_title: string; external\_url: string; pushed\_at: string; pushed\_by: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| ... 1 more ... \| undefined; }; } = CaseFullExternalServiceRt; `updated_at`: ``null`` \| `string` ; `updated_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }  }, `unknown`\>\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [`FindCasesArgs`](../interfaces/client._internal_namespace.FindCasesArgs.md) |

#### Returns

`Promise`<[`SavedObjectsFindResponse`](../interfaces/client._internal_namespace.SavedObjectsFindResponse.md)<{ `connector`: { id: string; } & { type: ConnectorTypes.jira; fields: { issueType: string \| null; priority: string \| null; parent: string \| null; } \| null; } & { name: string; } & { id: string; } & { type: ConnectorTypes.none; fields: null; } & { name: string; } & { id: string; } & { type: ConnectorTypes.resilient; fields: { incidentTypes: string[] \| null; severityCode: string \| null; } \| null; } & { name: string; } & { id: string; } & { type: ConnectorTypes.serviceNowITSM; fields: { impact: string \| null; severity: string \| null; urgency: string \| null; category: string \| null; subcategory: string \| null; } \| null; } & { name: string; } & { id: string; } & { type: ConnectorTypes.serviceNowSIR; fields: { category: string \| null; destIp: boolean \| null; malwareHash: boolean \| null; malwareUrl: boolean \| null; priority: string \| null; sourceIp: boolean \| null; subcategory: string \| null; } \| null; } & { name: string; } & { id: string; } & { type: ConnectorTypes.swimlane; fields: { caseId: string \| null; } \| null; } & { name: string; } = CaseConnectorRt; `description`: `string` = rt.string; `owner`: `string` = rt.string; `settings`: { syncAlerts: boolean; } = SettingsRt; `status`: `CaseStatuses` = CaseStatusRt; `tags`: `string`[] ; `title`: `string` = rt.string } & { `closed_at`: ``null`` \| `string` ; `closed_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `created_at`: `string` = rt.string; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } = UserRT; `external_service`: ``null`` \| { connector\_id: string; } & { connector\_name: string; external\_id: string; external\_title: string; external\_url: string; pushed\_at: string; pushed\_by: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| ... 1 more ... \| undefined; }; } = CaseFullExternalServiceRt; `updated_at`: ``null`` \| `string` ; `updated_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }  }, `unknown`\>\>

#### Defined in

[x-pack/plugins/cases/server/services/cases/index.ts:395](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/services/cases/index.ts#L395)

___

### findCasesGroupedByID

▸ **findCasesGroupedByID**(`__namedParameters`): `Promise`<[`CasesMapWithPageInfo`](../interfaces/client._internal_namespace.CasesMapWithPageInfo.md)\>

Returns a map of all cases.

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | `Object` |
| `__namedParameters.caseOptions` | [`FindCaseOptions`](../modules/client._internal_namespace.md#findcaseoptions) |
| `__namedParameters.unsecuredSavedObjectsClient` | [`SavedObjectsClientContract`](../modules/client._internal_namespace.md#savedobjectsclientcontract) |

#### Returns

`Promise`<[`CasesMapWithPageInfo`](../interfaces/client._internal_namespace.CasesMapWithPageInfo.md)\>

#### Defined in

[x-pack/plugins/cases/server/services/cases/index.ts:206](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/services/cases/index.ts#L206)

___

### getAllCaseComments

▸ **getAllCaseComments**(`__namedParameters`): `Promise`<[`SavedObjectsFindResponse`](../interfaces/client._internal_namespace.SavedObjectsFindResponse.md)<{ `comment`: `string` = rt.string; `owner`: `string` = rt.string; `type`: [`user`](../modules/client._internal_namespace.md#user)  } & { `created_at`: `string` = rt.string; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } = UserRT; `owner`: `string` = rt.string; `pushed_at`: ``null`` \| `string` ; `pushed_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `updated_at`: ``null`` \| `string` ; `updated_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }  } \| { `alertId`: `string` \| `string`[] ; `index`: `string` \| `string`[] ; `owner`: `string` = rt.string; `rule`: { id: string \| null; name: string \| null; } ; `type`: [`alert`](../modules/client._internal_namespace.md#alert)  } & { `created_at`: `string` = rt.string; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } = UserRT; `owner`: `string` = rt.string; `pushed_at`: ``null`` \| `string` ; `pushed_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `updated_at`: ``null`` \| `string` ; `updated_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }  } \| { `actions`: { targets: { hostname: string; endpointId: string; }[]; type: string; } ; `comment`: `string` = rt.string; `owner`: `string` = rt.string; `type`: [`actions`](../modules/client._internal_namespace.md#actions)  } & { `created_at`: `string` = rt.string; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } = UserRT; `owner`: `string` = rt.string; `pushed_at`: ``null`` \| `string` ; `pushed_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `updated_at`: ``null`` \| `string` ; `updated_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }  }, `unknown`\>\>

Default behavior is to retrieve all comments that adhere to a given filter (if one is included).
to override this pass in the either the page or perPage options.

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [`FindCaseCommentsArgs`](../interfaces/client._internal_namespace.FindCaseCommentsArgs.md) |

#### Returns

`Promise`<[`SavedObjectsFindResponse`](../interfaces/client._internal_namespace.SavedObjectsFindResponse.md)<{ `comment`: `string` = rt.string; `owner`: `string` = rt.string; `type`: [`user`](../modules/client._internal_namespace.md#user)  } & { `created_at`: `string` = rt.string; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } = UserRT; `owner`: `string` = rt.string; `pushed_at`: ``null`` \| `string` ; `pushed_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `updated_at`: ``null`` \| `string` ; `updated_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }  } \| { `alertId`: `string` \| `string`[] ; `index`: `string` \| `string`[] ; `owner`: `string` = rt.string; `rule`: { id: string \| null; name: string \| null; } ; `type`: [`alert`](../modules/client._internal_namespace.md#alert)  } & { `created_at`: `string` = rt.string; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } = UserRT; `owner`: `string` = rt.string; `pushed_at`: ``null`` \| `string` ; `pushed_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `updated_at`: ``null`` \| `string` ; `updated_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }  } \| { `actions`: { targets: { hostname: string; endpointId: string; }[]; type: string; } ; `comment`: `string` = rt.string; `owner`: `string` = rt.string; `type`: [`actions`](../modules/client._internal_namespace.md#actions)  } & { `created_at`: `string` = rt.string; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } = UserRT; `owner`: `string` = rt.string; `pushed_at`: ``null`` \| `string` ; `pushed_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `updated_at`: ``null`` \| `string` ; `updated_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }  }, `unknown`\>\>

#### Defined in

[x-pack/plugins/cases/server/services/cases/index.ts:455](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/services/cases/index.ts#L455)

___

### getAllComments

▸ `Private` **getAllComments**(`__namedParameters`): `Promise`<[`SavedObjectsFindResponse`](../interfaces/client._internal_namespace.SavedObjectsFindResponse.md)<{ `comment`: `string` = rt.string; `owner`: `string` = rt.string; `type`: [`user`](../modules/client._internal_namespace.md#user)  } & { `created_at`: `string` = rt.string; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } = UserRT; `owner`: `string` = rt.string; `pushed_at`: ``null`` \| `string` ; `pushed_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `updated_at`: ``null`` \| `string` ; `updated_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }  } \| { `alertId`: `string` \| `string`[] ; `index`: `string` \| `string`[] ; `owner`: `string` = rt.string; `rule`: { id: string \| null; name: string \| null; } ; `type`: [`alert`](../modules/client._internal_namespace.md#alert)  } & { `created_at`: `string` = rt.string; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } = UserRT; `owner`: `string` = rt.string; `pushed_at`: ``null`` \| `string` ; `pushed_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `updated_at`: ``null`` \| `string` ; `updated_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }  } \| { `actions`: { targets: { hostname: string; endpointId: string; }[]; type: string; } ; `comment`: `string` = rt.string; `owner`: `string` = rt.string; `type`: [`actions`](../modules/client._internal_namespace.md#actions)  } & { `created_at`: `string` = rt.string; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } = UserRT; `owner`: `string` = rt.string; `pushed_at`: ``null`` \| `string` ; `pushed_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `updated_at`: ``null`` \| `string` ; `updated_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }  }, `unknown`\>\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [`FindCommentsArgs`](../interfaces/client._internal_namespace.FindCommentsArgs.md) |

#### Returns

`Promise`<[`SavedObjectsFindResponse`](../interfaces/client._internal_namespace.SavedObjectsFindResponse.md)<{ `comment`: `string` = rt.string; `owner`: `string` = rt.string; `type`: [`user`](../modules/client._internal_namespace.md#user)  } & { `created_at`: `string` = rt.string; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } = UserRT; `owner`: `string` = rt.string; `pushed_at`: ``null`` \| `string` ; `pushed_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `updated_at`: ``null`` \| `string` ; `updated_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }  } \| { `alertId`: `string` \| `string`[] ; `index`: `string` \| `string`[] ; `owner`: `string` = rt.string; `rule`: { id: string \| null; name: string \| null; } ; `type`: [`alert`](../modules/client._internal_namespace.md#alert)  } & { `created_at`: `string` = rt.string; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } = UserRT; `owner`: `string` = rt.string; `pushed_at`: ``null`` \| `string` ; `pushed_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `updated_at`: ``null`` \| `string` ; `updated_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }  } \| { `actions`: { targets: { hostname: string; endpointId: string; }[]; type: string; } ; `comment`: `string` = rt.string; `owner`: `string` = rt.string; `type`: [`actions`](../modules/client._internal_namespace.md#actions)  } & { `created_at`: `string` = rt.string; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } = UserRT; `owner`: `string` = rt.string; `pushed_at`: ``null`` \| `string` ; `pushed_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `updated_at`: ``null`` \| `string` ; `updated_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }  }, `unknown`\>\>

#### Defined in

[x-pack/plugins/cases/server/services/cases/index.ts:423](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/services/cases/index.ts#L423)

___

### getCase

▸ **getCase**(`__namedParameters`): `Promise`<[`SavedObject`](../interfaces/client._internal_namespace.SavedObject.md)<{ `connector`: { id: string; } & { type: ConnectorTypes.jira; fields: { issueType: string \| null; priority: string \| null; parent: string \| null; } \| null; } & { name: string; } & { id: string; } & { type: ConnectorTypes.none; fields: null; } & { name: string; } & { id: string; } & { type: ConnectorTypes.resilient; fields: { incidentTypes: string[] \| null; severityCode: string \| null; } \| null; } & { name: string; } & { id: string; } & { type: ConnectorTypes.serviceNowITSM; fields: { impact: string \| null; severity: string \| null; urgency: string \| null; category: string \| null; subcategory: string \| null; } \| null; } & { name: string; } & { id: string; } & { type: ConnectorTypes.serviceNowSIR; fields: { category: string \| null; destIp: boolean \| null; malwareHash: boolean \| null; malwareUrl: boolean \| null; priority: string \| null; sourceIp: boolean \| null; subcategory: string \| null; } \| null; } & { name: string; } & { id: string; } & { type: ConnectorTypes.swimlane; fields: { caseId: string \| null; } \| null; } & { name: string; } = CaseConnectorRt; `description`: `string` = rt.string; `owner`: `string` = rt.string; `settings`: { syncAlerts: boolean; } = SettingsRt; `status`: `CaseStatuses` = CaseStatusRt; `tags`: `string`[] ; `title`: `string` = rt.string } & { `closed_at`: ``null`` \| `string` ; `closed_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `created_at`: `string` = rt.string; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } = UserRT; `external_service`: ``null`` \| { connector\_id: string; } & { connector\_name: string; external\_id: string; external\_title: string; external\_url: string; pushed\_at: string; pushed\_by: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| ... 1 more ... \| undefined; }; } = CaseFullExternalServiceRt; `updated_at`: ``null`` \| `string` ; `updated_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }  }\>\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [`GetCaseArgs`](../interfaces/client._internal_namespace.GetCaseArgs.md) |

#### Returns

`Promise`<[`SavedObject`](../interfaces/client._internal_namespace.SavedObject.md)<{ `connector`: { id: string; } & { type: ConnectorTypes.jira; fields: { issueType: string \| null; priority: string \| null; parent: string \| null; } \| null; } & { name: string; } & { id: string; } & { type: ConnectorTypes.none; fields: null; } & { name: string; } & { id: string; } & { type: ConnectorTypes.resilient; fields: { incidentTypes: string[] \| null; severityCode: string \| null; } \| null; } & { name: string; } & { id: string; } & { type: ConnectorTypes.serviceNowITSM; fields: { impact: string \| null; severity: string \| null; urgency: string \| null; category: string \| null; subcategory: string \| null; } \| null; } & { name: string; } & { id: string; } & { type: ConnectorTypes.serviceNowSIR; fields: { category: string \| null; destIp: boolean \| null; malwareHash: boolean \| null; malwareUrl: boolean \| null; priority: string \| null; sourceIp: boolean \| null; subcategory: string \| null; } \| null; } & { name: string; } & { id: string; } & { type: ConnectorTypes.swimlane; fields: { caseId: string \| null; } \| null; } & { name: string; } = CaseConnectorRt; `description`: `string` = rt.string; `owner`: `string` = rt.string; `settings`: { syncAlerts: boolean; } = SettingsRt; `status`: `CaseStatuses` = CaseStatusRt; `tags`: `string`[] ; `title`: `string` = rt.string } & { `closed_at`: ``null`` \| `string` ; `closed_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `created_at`: `string` = rt.string; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } = UserRT; `external_service`: ``null`` \| { connector\_id: string; } & { connector\_name: string; external\_id: string; external\_title: string; external\_url: string; pushed\_at: string; pushed\_by: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| ... 1 more ... \| undefined; }; } = CaseFullExternalServiceRt; `updated_at`: ``null`` \| `string` ; `updated_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }  }\>\>

#### Defined in

[x-pack/plugins/cases/server/services/cases/index.ts:342](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/services/cases/index.ts#L342)

___

### getCaseCommentStats

▸ **getCaseCommentStats**(`__namedParameters`): `Promise`<[`CaseCommentStats`](../interfaces/client._internal_namespace.CaseCommentStats.md)\>

Returns the number of total comments and alerts for a case

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | `Object` |
| `__namedParameters.ids` | `string`[] |
| `__namedParameters.unsecuredSavedObjectsClient` | [`SavedObjectsClientContract`](../modules/client._internal_namespace.md#savedobjectsclientcontract) |

#### Returns

`Promise`<[`CaseCommentStats`](../interfaces/client._internal_namespace.CaseCommentStats.md)\>

#### Defined in

[x-pack/plugins/cases/server/services/cases/index.ts:280](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/services/cases/index.ts#L280)

___

### getCaseIdsByAlertId

▸ **getCaseIdsByAlertId**(`__namedParameters`): `Promise`<[`SavedObjectsFindResponse`](../interfaces/client._internal_namespace.SavedObjectsFindResponse.md)<{ `comment`: `string` = rt.string; `owner`: `string` = rt.string; `type`: [`user`](../modules/client._internal_namespace.md#user)  } & { `created_at`: `string` = rt.string; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } = UserRT; `owner`: `string` = rt.string; `pushed_at`: ``null`` \| `string` ; `pushed_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `updated_at`: ``null`` \| `string` ; `updated_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }  } \| { `alertId`: `string` \| `string`[] ; `index`: `string` \| `string`[] ; `owner`: `string` = rt.string; `rule`: { id: string \| null; name: string \| null; } ; `type`: [`alert`](../modules/client._internal_namespace.md#alert)  } & { `created_at`: `string` = rt.string; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } = UserRT; `owner`: `string` = rt.string; `pushed_at`: ``null`` \| `string` ; `pushed_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `updated_at`: ``null`` \| `string` ; `updated_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }  } \| { `actions`: { targets: { hostname: string; endpointId: string; }[]; type: string; } ; `comment`: `string` = rt.string; `owner`: `string` = rt.string; `type`: [`actions`](../modules/client._internal_namespace.md#actions)  } & { `created_at`: `string` = rt.string; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } = UserRT; `owner`: `string` = rt.string; `pushed_at`: ``null`` \| `string` ; `pushed_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `updated_at`: ``null`` \| `string` ; `updated_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }  }, { `references`: { doc\_count: number; caseIds: { buckets: { key: string; }[]; }; }  }\>\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [`GetCaseIdsByAlertIdArgs`](../interfaces/client._internal_namespace.GetCaseIdsByAlertIdArgs.md) |

#### Returns

`Promise`<[`SavedObjectsFindResponse`](../interfaces/client._internal_namespace.SavedObjectsFindResponse.md)<{ `comment`: `string` = rt.string; `owner`: `string` = rt.string; `type`: [`user`](../modules/client._internal_namespace.md#user)  } & { `created_at`: `string` = rt.string; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } = UserRT; `owner`: `string` = rt.string; `pushed_at`: ``null`` \| `string` ; `pushed_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `updated_at`: ``null`` \| `string` ; `updated_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }  } \| { `alertId`: `string` \| `string`[] ; `index`: `string` \| `string`[] ; `owner`: `string` = rt.string; `rule`: { id: string \| null; name: string \| null; } ; `type`: [`alert`](../modules/client._internal_namespace.md#alert)  } & { `created_at`: `string` = rt.string; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } = UserRT; `owner`: `string` = rt.string; `pushed_at`: ``null`` \| `string` ; `pushed_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `updated_at`: ``null`` \| `string` ; `updated_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }  } \| { `actions`: { targets: { hostname: string; endpointId: string; }[]; type: string; } ; `comment`: `string` = rt.string; `owner`: `string` = rt.string; `type`: [`actions`](../modules/client._internal_namespace.md#actions)  } & { `created_at`: `string` = rt.string; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } = UserRT; `owner`: `string` = rt.string; `pushed_at`: ``null`` \| `string` ; `pushed_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `updated_at`: ``null`` \| `string` ; `updated_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }  }, { `references`: { doc\_count: number; caseIds: { buckets: { key: string; }[]; }; }  }\>\>

#### Defined in

[x-pack/plugins/cases/server/services/cases/index.ts:161](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/services/cases/index.ts#L161)

___

### getCases

▸ **getCases**(`__namedParameters`): `Promise`<[`SavedObjectsBulkResponse`](../interfaces/client._internal_namespace.SavedObjectsBulkResponse.md)<{ `connector`: { id: string; } & { type: ConnectorTypes.jira; fields: { issueType: string \| null; priority: string \| null; parent: string \| null; } \| null; } & { name: string; } & { id: string; } & { type: ConnectorTypes.none; fields: null; } & { name: string; } & { id: string; } & { type: ConnectorTypes.resilient; fields: { incidentTypes: string[] \| null; severityCode: string \| null; } \| null; } & { name: string; } & { id: string; } & { type: ConnectorTypes.serviceNowITSM; fields: { impact: string \| null; severity: string \| null; urgency: string \| null; category: string \| null; subcategory: string \| null; } \| null; } & { name: string; } & { id: string; } & { type: ConnectorTypes.serviceNowSIR; fields: { category: string \| null; destIp: boolean \| null; malwareHash: boolean \| null; malwareUrl: boolean \| null; priority: string \| null; sourceIp: boolean \| null; subcategory: string \| null; } \| null; } & { name: string; } & { id: string; } & { type: ConnectorTypes.swimlane; fields: { caseId: string \| null; } \| null; } & { name: string; } = CaseConnectorRt; `description`: `string` = rt.string; `owner`: `string` = rt.string; `settings`: { syncAlerts: boolean; } = SettingsRt; `status`: `CaseStatuses` = CaseStatusRt; `tags`: `string`[] ; `title`: `string` = rt.string } & { `closed_at`: ``null`` \| `string` ; `closed_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `created_at`: `string` = rt.string; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } = UserRT; `external_service`: ``null`` \| { connector\_id: string; } & { connector\_name: string; external\_id: string; external\_title: string; external\_url: string; pushed\_at: string; pushed\_by: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| ... 1 more ... \| undefined; }; } = CaseFullExternalServiceRt; `updated_at`: ``null`` \| `string` ; `updated_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }  }\>\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [`GetCasesArgs`](../interfaces/client._internal_namespace.GetCasesArgs.md) |

#### Returns

`Promise`<[`SavedObjectsBulkResponse`](../interfaces/client._internal_namespace.SavedObjectsBulkResponse.md)<{ `connector`: { id: string; } & { type: ConnectorTypes.jira; fields: { issueType: string \| null; priority: string \| null; parent: string \| null; } \| null; } & { name: string; } & { id: string; } & { type: ConnectorTypes.none; fields: null; } & { name: string; } & { id: string; } & { type: ConnectorTypes.resilient; fields: { incidentTypes: string[] \| null; severityCode: string \| null; } \| null; } & { name: string; } & { id: string; } & { type: ConnectorTypes.serviceNowITSM; fields: { impact: string \| null; severity: string \| null; urgency: string \| null; category: string \| null; subcategory: string \| null; } \| null; } & { name: string; } & { id: string; } & { type: ConnectorTypes.serviceNowSIR; fields: { category: string \| null; destIp: boolean \| null; malwareHash: boolean \| null; malwareUrl: boolean \| null; priority: string \| null; sourceIp: boolean \| null; subcategory: string \| null; } \| null; } & { name: string; } & { id: string; } & { type: ConnectorTypes.swimlane; fields: { caseId: string \| null; } \| null; } & { name: string; } = CaseConnectorRt; `description`: `string` = rt.string; `owner`: `string` = rt.string; `settings`: { syncAlerts: boolean; } = SettingsRt; `status`: `CaseStatuses` = CaseStatusRt; `tags`: `string`[] ; `title`: `string` = rt.string } & { `closed_at`: ``null`` \| `string` ; `closed_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `created_at`: `string` = rt.string; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } = UserRT; `external_service`: ``null`` \| { connector\_id: string; } & { connector\_name: string; external\_id: string; external\_title: string; external\_url: string; pushed\_at: string; pushed\_by: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| ... 1 more ... \| undefined; }; } = CaseFullExternalServiceRt; `updated_at`: ``null`` \| `string` ; `updated_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }  }\>\>

#### Defined in

[x-pack/plugins/cases/server/services/cases/index.ts:379](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/services/cases/index.ts#L379)

___

### getReporters

▸ **getReporters**(`__namedParameters`): `Promise`<{ `email`: `undefined` \| ``null`` \| `string` ; `full_name`: `undefined` \| ``null`` \| `string` ; `username`: `undefined` \| ``null`` \| `string`  }[]\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [`GetReportersArgs`](../interfaces/client._internal_namespace.GetReportersArgs.md) |

#### Returns

`Promise`<{ `email`: `undefined` \| ``null`` \| `string` ; `full_name`: `undefined` \| ``null`` \| `string` ; `username`: `undefined` \| ``null`` \| `string`  }[]\>

#### Defined in

[x-pack/plugins/cases/server/services/cases/index.ts:488](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/services/cases/index.ts#L488)

___

### getResolveCase

▸ **getResolveCase**(`__namedParameters`): `Promise`<[`SavedObjectsResolveResponse`](../interfaces/client._internal_namespace.SavedObjectsResolveResponse.md)<{ `connector`: { id: string; } & { type: ConnectorTypes.jira; fields: { issueType: string \| null; priority: string \| null; parent: string \| null; } \| null; } & { name: string; } & { id: string; } & { type: ConnectorTypes.none; fields: null; } & { name: string; } & { id: string; } & { type: ConnectorTypes.resilient; fields: { incidentTypes: string[] \| null; severityCode: string \| null; } \| null; } & { name: string; } & { id: string; } & { type: ConnectorTypes.serviceNowITSM; fields: { impact: string \| null; severity: string \| null; urgency: string \| null; category: string \| null; subcategory: string \| null; } \| null; } & { name: string; } & { id: string; } & { type: ConnectorTypes.serviceNowSIR; fields: { category: string \| null; destIp: boolean \| null; malwareHash: boolean \| null; malwareUrl: boolean \| null; priority: string \| null; sourceIp: boolean \| null; subcategory: string \| null; } \| null; } & { name: string; } & { id: string; } & { type: ConnectorTypes.swimlane; fields: { caseId: string \| null; } \| null; } & { name: string; } = CaseConnectorRt; `description`: `string` = rt.string; `owner`: `string` = rt.string; `settings`: { syncAlerts: boolean; } = SettingsRt; `status`: `CaseStatuses` = CaseStatusRt; `tags`: `string`[] ; `title`: `string` = rt.string } & { `closed_at`: ``null`` \| `string` ; `closed_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `created_at`: `string` = rt.string; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } = UserRT; `external_service`: ``null`` \| { connector\_id: string; } & { connector\_name: string; external\_id: string; external\_title: string; external\_url: string; pushed\_at: string; pushed\_by: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| ... 1 more ... \| undefined; }; } = CaseFullExternalServiceRt; `updated_at`: ``null`` \| `string` ; `updated_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }  }\>\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [`GetCaseArgs`](../interfaces/client._internal_namespace.GetCaseArgs.md) |

#### Returns

`Promise`<[`SavedObjectsResolveResponse`](../interfaces/client._internal_namespace.SavedObjectsResolveResponse.md)<{ `connector`: { id: string; } & { type: ConnectorTypes.jira; fields: { issueType: string \| null; priority: string \| null; parent: string \| null; } \| null; } & { name: string; } & { id: string; } & { type: ConnectorTypes.none; fields: null; } & { name: string; } & { id: string; } & { type: ConnectorTypes.resilient; fields: { incidentTypes: string[] \| null; severityCode: string \| null; } \| null; } & { name: string; } & { id: string; } & { type: ConnectorTypes.serviceNowITSM; fields: { impact: string \| null; severity: string \| null; urgency: string \| null; category: string \| null; subcategory: string \| null; } \| null; } & { name: string; } & { id: string; } & { type: ConnectorTypes.serviceNowSIR; fields: { category: string \| null; destIp: boolean \| null; malwareHash: boolean \| null; malwareUrl: boolean \| null; priority: string \| null; sourceIp: boolean \| null; subcategory: string \| null; } \| null; } & { name: string; } & { id: string; } & { type: ConnectorTypes.swimlane; fields: { caseId: string \| null; } \| null; } & { name: string; } = CaseConnectorRt; `description`: `string` = rt.string; `owner`: `string` = rt.string; `settings`: { syncAlerts: boolean; } = SettingsRt; `status`: `CaseStatuses` = CaseStatusRt; `tags`: `string`[] ; `title`: `string` = rt.string } & { `closed_at`: ``null`` \| `string` ; `closed_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `created_at`: `string` = rt.string; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } = UserRT; `external_service`: ``null`` \| { connector\_id: string; } & { connector\_name: string; external\_id: string; external\_title: string; external\_url: string; pushed\_at: string; pushed\_by: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| ... 1 more ... \| undefined; }; } = CaseFullExternalServiceRt; `updated_at`: ``null`` \| `string` ; `updated_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }  }\>\>

#### Defined in

[x-pack/plugins/cases/server/services/cases/index.ts:359](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/services/cases/index.ts#L359)

___

### getTags

▸ **getTags**(`__namedParameters`): `Promise`<`string`[]\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [`GetTagsArgs`](../interfaces/client._internal_namespace.GetTagsArgs.md) |

#### Returns

`Promise`<`string`[]\>

#### Defined in

[x-pack/plugins/cases/server/services/cases/index.ts:552](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/services/cases/index.ts#L552)

___

### getUser

▸ **getUser**(`__namedParameters`): [`AuthenticatedUser`](../interfaces/client._internal_namespace.AuthenticatedUser.md) \| { `email`: ``null`` = null; `full_name`: ``null`` = null; `username`: ``null`` = null }

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [`GetUserArgs`](../interfaces/client._internal_namespace.GetUserArgs.md) |

#### Returns

[`AuthenticatedUser`](../interfaces/client._internal_namespace.AuthenticatedUser.md) \| { `email`: ``null`` = null; `full_name`: ``null`` = null; `username`: ``null`` = null }

#### Defined in

[x-pack/plugins/cases/server/services/cases/index.ts:582](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/services/cases/index.ts#L582)

___

### patchCase

▸ **patchCase**(`__namedParameters`): `Promise`<[`SavedObjectsUpdateResponse`](../interfaces/client._internal_namespace.SavedObjectsUpdateResponse.md)<{ `connector`: { id: string; } & { type: ConnectorTypes.jira; fields: { issueType: string \| null; priority: string \| null; parent: string \| null; } \| null; } & { name: string; } & { id: string; } & { type: ConnectorTypes.none; fields: null; } & { name: string; } & { id: string; } & { type: ConnectorTypes.resilient; fields: { incidentTypes: string[] \| null; severityCode: string \| null; } \| null; } & { name: string; } & { id: string; } & { type: ConnectorTypes.serviceNowITSM; fields: { impact: string \| null; severity: string \| null; urgency: string \| null; category: string \| null; subcategory: string \| null; } \| null; } & { name: string; } & { id: string; } & { type: ConnectorTypes.serviceNowSIR; fields: { category: string \| null; destIp: boolean \| null; malwareHash: boolean \| null; malwareUrl: boolean \| null; priority: string \| null; sourceIp: boolean \| null; subcategory: string \| null; } \| null; } & { name: string; } & { id: string; } & { type: ConnectorTypes.swimlane; fields: { caseId: string \| null; } \| null; } & { name: string; } = CaseConnectorRt; `description`: `string` = rt.string; `owner`: `string` = rt.string; `settings`: { syncAlerts: boolean; } = SettingsRt; `status`: `CaseStatuses` = CaseStatusRt; `tags`: `string`[] ; `title`: `string` = rt.string } & { `closed_at`: ``null`` \| `string` ; `closed_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `created_at`: `string` = rt.string; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } = UserRT; `external_service`: ``null`` \| { connector\_id: string; } & { connector\_name: string; external\_id: string; external\_title: string; external\_url: string; pushed\_at: string; pushed\_by: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| ... 1 more ... \| undefined; }; } = CaseFullExternalServiceRt; `updated_at`: ``null`` \| `string` ; `updated_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }  }\>\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [`PatchCaseArgs`](../modules/client._internal_namespace.md#patchcaseargs) |

#### Returns

`Promise`<[`SavedObjectsUpdateResponse`](../interfaces/client._internal_namespace.SavedObjectsUpdateResponse.md)<{ `connector`: { id: string; } & { type: ConnectorTypes.jira; fields: { issueType: string \| null; priority: string \| null; parent: string \| null; } \| null; } & { name: string; } & { id: string; } & { type: ConnectorTypes.none; fields: null; } & { name: string; } & { id: string; } & { type: ConnectorTypes.resilient; fields: { incidentTypes: string[] \| null; severityCode: string \| null; } \| null; } & { name: string; } & { id: string; } & { type: ConnectorTypes.serviceNowITSM; fields: { impact: string \| null; severity: string \| null; urgency: string \| null; category: string \| null; subcategory: string \| null; } \| null; } & { name: string; } & { id: string; } & { type: ConnectorTypes.serviceNowSIR; fields: { category: string \| null; destIp: boolean \| null; malwareHash: boolean \| null; malwareUrl: boolean \| null; priority: string \| null; sourceIp: boolean \| null; subcategory: string \| null; } \| null; } & { name: string; } & { id: string; } & { type: ConnectorTypes.swimlane; fields: { caseId: string \| null; } \| null; } & { name: string; } = CaseConnectorRt; `description`: `string` = rt.string; `owner`: `string` = rt.string; `settings`: { syncAlerts: boolean; } = SettingsRt; `status`: `CaseStatuses` = CaseStatusRt; `tags`: `string`[] ; `title`: `string` = rt.string } & { `closed_at`: ``null`` \| `string` ; `closed_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `created_at`: `string` = rt.string; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } = UserRT; `external_service`: ``null`` \| { connector\_id: string; } & { connector\_name: string; external\_id: string; external\_title: string; external\_url: string; pushed\_at: string; pushed\_by: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| ... 1 more ... \| undefined; }; } = CaseFullExternalServiceRt; `updated_at`: ``null`` \| `string` ; `updated_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }  }\>\>

#### Defined in

[x-pack/plugins/cases/server/services/cases/index.ts:627](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/services/cases/index.ts#L627)

___

### patchCases

▸ **patchCases**(`__namedParameters`): `Promise`<[`SavedObjectsBulkUpdateResponse`](../interfaces/client._internal_namespace.SavedObjectsBulkUpdateResponse.md)<{ `connector`: { id: string; } & { type: ConnectorTypes.jira; fields: { issueType: string \| null; priority: string \| null; parent: string \| null; } \| null; } & { name: string; } & { id: string; } & { type: ConnectorTypes.none; fields: null; } & { name: string; } & { id: string; } & { type: ConnectorTypes.resilient; fields: { incidentTypes: string[] \| null; severityCode: string \| null; } \| null; } & { name: string; } & { id: string; } & { type: ConnectorTypes.serviceNowITSM; fields: { impact: string \| null; severity: string \| null; urgency: string \| null; category: string \| null; subcategory: string \| null; } \| null; } & { name: string; } & { id: string; } & { type: ConnectorTypes.serviceNowSIR; fields: { category: string \| null; destIp: boolean \| null; malwareHash: boolean \| null; malwareUrl: boolean \| null; priority: string \| null; sourceIp: boolean \| null; subcategory: string \| null; } \| null; } & { name: string; } & { id: string; } & { type: ConnectorTypes.swimlane; fields: { caseId: string \| null; } \| null; } & { name: string; } = CaseConnectorRt; `description`: `string` = rt.string; `owner`: `string` = rt.string; `settings`: { syncAlerts: boolean; } = SettingsRt; `status`: `CaseStatuses` = CaseStatusRt; `tags`: `string`[] ; `title`: `string` = rt.string } & { `closed_at`: ``null`` \| `string` ; `closed_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `created_at`: `string` = rt.string; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } = UserRT; `external_service`: ``null`` \| { connector\_id: string; } & { connector\_name: string; external\_id: string; external\_title: string; external\_url: string; pushed\_at: string; pushed\_by: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| ... 1 more ... \| undefined; }; } = CaseFullExternalServiceRt; `updated_at`: ``null`` \| `string` ; `updated_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }  }\>\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [`PatchCasesArgs`](../interfaces/client._internal_namespace.PatchCasesArgs.md) |

#### Returns

`Promise`<[`SavedObjectsBulkUpdateResponse`](../interfaces/client._internal_namespace.SavedObjectsBulkUpdateResponse.md)<{ `connector`: { id: string; } & { type: ConnectorTypes.jira; fields: { issueType: string \| null; priority: string \| null; parent: string \| null; } \| null; } & { name: string; } & { id: string; } & { type: ConnectorTypes.none; fields: null; } & { name: string; } & { id: string; } & { type: ConnectorTypes.resilient; fields: { incidentTypes: string[] \| null; severityCode: string \| null; } \| null; } & { name: string; } & { id: string; } & { type: ConnectorTypes.serviceNowITSM; fields: { impact: string \| null; severity: string \| null; urgency: string \| null; category: string \| null; subcategory: string \| null; } \| null; } & { name: string; } & { id: string; } & { type: ConnectorTypes.serviceNowSIR; fields: { category: string \| null; destIp: boolean \| null; malwareHash: boolean \| null; malwareUrl: boolean \| null; priority: string \| null; sourceIp: boolean \| null; subcategory: string \| null; } \| null; } & { name: string; } & { id: string; } & { type: ConnectorTypes.swimlane; fields: { caseId: string \| null; } \| null; } & { name: string; } = CaseConnectorRt; `description`: `string` = rt.string; `owner`: `string` = rt.string; `settings`: { syncAlerts: boolean; } = SettingsRt; `status`: `CaseStatuses` = CaseStatusRt; `tags`: `string`[] ; `title`: `string` = rt.string } & { `closed_at`: ``null`` \| `string` ; `closed_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `created_at`: `string` = rt.string; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } = UserRT; `external_service`: ``null`` \| { connector\_id: string; } & { connector\_name: string; external\_id: string; external\_title: string; external\_url: string; pushed\_at: string; pushed\_by: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| ... 1 more ... \| undefined; }; } = CaseFullExternalServiceRt; `updated_at`: ``null`` \| `string` ; `updated_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }  }\>\>

#### Defined in

[x-pack/plugins/cases/server/services/cases/index.ts:655](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/services/cases/index.ts#L655)

___

### postNewCase

▸ **postNewCase**(`__namedParameters`): `Promise`<[`SavedObject`](../interfaces/client._internal_namespace.SavedObject.md)<{ `connector`: { id: string; } & { type: ConnectorTypes.jira; fields: { issueType: string \| null; priority: string \| null; parent: string \| null; } \| null; } & { name: string; } & { id: string; } & { type: ConnectorTypes.none; fields: null; } & { name: string; } & { id: string; } & { type: ConnectorTypes.resilient; fields: { incidentTypes: string[] \| null; severityCode: string \| null; } \| null; } & { name: string; } & { id: string; } & { type: ConnectorTypes.serviceNowITSM; fields: { impact: string \| null; severity: string \| null; urgency: string \| null; category: string \| null; subcategory: string \| null; } \| null; } & { name: string; } & { id: string; } & { type: ConnectorTypes.serviceNowSIR; fields: { category: string \| null; destIp: boolean \| null; malwareHash: boolean \| null; malwareUrl: boolean \| null; priority: string \| null; sourceIp: boolean \| null; subcategory: string \| null; } \| null; } & { name: string; } & { id: string; } & { type: ConnectorTypes.swimlane; fields: { caseId: string \| null; } \| null; } & { name: string; } = CaseConnectorRt; `description`: `string` = rt.string; `owner`: `string` = rt.string; `settings`: { syncAlerts: boolean; } = SettingsRt; `status`: `CaseStatuses` = CaseStatusRt; `tags`: `string`[] ; `title`: `string` = rt.string } & { `closed_at`: ``null`` \| `string` ; `closed_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `created_at`: `string` = rt.string; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } = UserRT; `external_service`: ``null`` \| { connector\_id: string; } & { connector\_name: string; external\_id: string; external\_title: string; external\_url: string; pushed\_at: string; pushed\_by: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| ... 1 more ... \| undefined; }; } = CaseFullExternalServiceRt; `updated_at`: ``null`` \| `string` ; `updated_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }  }\>\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [`PostCaseArgs`](../interfaces/client._internal_namespace.PostCaseArgs.md) |

#### Returns

`Promise`<[`SavedObject`](../interfaces/client._internal_namespace.SavedObject.md)<{ `connector`: { id: string; } & { type: ConnectorTypes.jira; fields: { issueType: string \| null; priority: string \| null; parent: string \| null; } \| null; } & { name: string; } & { id: string; } & { type: ConnectorTypes.none; fields: null; } & { name: string; } & { id: string; } & { type: ConnectorTypes.resilient; fields: { incidentTypes: string[] \| null; severityCode: string \| null; } \| null; } & { name: string; } & { id: string; } & { type: ConnectorTypes.serviceNowITSM; fields: { impact: string \| null; severity: string \| null; urgency: string \| null; category: string \| null; subcategory: string \| null; } \| null; } & { name: string; } & { id: string; } & { type: ConnectorTypes.serviceNowSIR; fields: { category: string \| null; destIp: boolean \| null; malwareHash: boolean \| null; malwareUrl: boolean \| null; priority: string \| null; sourceIp: boolean \| null; subcategory: string \| null; } \| null; } & { name: string; } & { id: string; } & { type: ConnectorTypes.swimlane; fields: { caseId: string \| null; } \| null; } & { name: string; } = CaseConnectorRt; `description`: `string` = rt.string; `owner`: `string` = rt.string; `settings`: { syncAlerts: boolean; } = SettingsRt; `status`: `CaseStatuses` = CaseStatusRt; `tags`: `string`[] ; `title`: `string` = rt.string } & { `closed_at`: ``null`` \| `string` ; `closed_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `created_at`: `string` = rt.string; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } = UserRT; `external_service`: ``null`` \| { connector\_id: string; } & { connector\_name: string; external\_id: string; external\_title: string; external\_url: string; pushed\_at: string; pushed\_by: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| ... 1 more ... \| undefined; }; } = CaseFullExternalServiceRt; `updated_at`: ``null`` \| `string` ; `updated_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }  }\>\>

#### Defined in

[x-pack/plugins/cases/server/services/cases/index.ts:607](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/services/cases/index.ts#L607)

___

### getCaseIDsFromAlertAggs

▸ `Static` **getCaseIDsFromAlertAggs**(`result`): `string`[]

Extracts the case IDs from the alert aggregation

#### Parameters

| Name | Type |
| :------ | :------ |
| `result` | [`SavedObjectsFindResponse`](../interfaces/client._internal_namespace.SavedObjectsFindResponse.md)<{ `comment`: `string` = rt.string; `owner`: `string` = rt.string; `type`: [`user`](../modules/client._internal_namespace.md#user)  } & { `created_at`: `string` = rt.string; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } = UserRT; `owner`: `string` = rt.string; `pushed_at`: ``null`` \| `string` ; `pushed_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `updated_at`: ``null`` \| `string` ; `updated_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }  } \| { `alertId`: `string` \| `string`[] ; `index`: `string` \| `string`[] ; `owner`: `string` = rt.string; `rule`: { id: string \| null; name: string \| null; } ; `type`: [`alert`](../modules/client._internal_namespace.md#alert)  } & { `created_at`: `string` = rt.string; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } = UserRT; `owner`: `string` = rt.string; `pushed_at`: ``null`` \| `string` ; `pushed_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `updated_at`: ``null`` \| `string` ; `updated_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }  } \| { `actions`: { targets: { hostname: string; endpointId: string; }[]; type: string; } ; `comment`: `string` = rt.string; `owner`: `string` = rt.string; `type`: [`actions`](../modules/client._internal_namespace.md#actions)  } & { `created_at`: `string` = rt.string; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } = UserRT; `owner`: `string` = rt.string; `pushed_at`: ``null`` \| `string` ; `pushed_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `updated_at`: ``null`` \| `string` ; `updated_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }  }, { `references`: { doc\_count: number; caseIds: { buckets: { key: string; }[]; }; }  }\> |

#### Returns

`string`[]

#### Defined in

[x-pack/plugins/cases/server/services/cases/index.ts:197](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/services/cases/index.ts#L197)
