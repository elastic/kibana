[Alerts as data client API Interface](../alerts_client_api.md) / AlertsClient

# Class: AlertsClient

Provides apis to interact with alerts as data
ensures the request is authorized to perform read / write actions
on alerts as data.

## Table of contents

### Constructors

- [constructor](alertsclient.md#constructor)

### Properties

- [auditLogger](alertsclient.md#auditlogger)
- [authorization](alertsclient.md#authorization)
- [esClient](alertsclient.md#esclient)
- [logger](alertsclient.md#logger)
- [spaceId](alertsclient.md#spaceid)

### Methods

- [buildEsQueryWithAuthz](alertsclient.md#buildesquerywithauthz)
- [bulkUpdate](alertsclient.md#bulkupdate)
- [ensureAllAuthorized](alertsclient.md#ensureallauthorized)
- [find](alertsclient.md#find)
- [get](alertsclient.md#get)
- [getAlertStatusFieldUpdate](alertsclient.md#getalertstatusfieldupdate)
- [getAuthorizedAlertsIndices](alertsclient.md#getauthorizedalertsindices)
- [getOutcome](alertsclient.md#getoutcome)
- [mgetAlertsAuditOperate](alertsclient.md#mgetalertsauditoperate)
- [queryAndAuditAllAlerts](alertsclient.md#queryandauditallalerts)
- [singleSearchAfterAndAudit](alertsclient.md#singlesearchafterandaudit)
- [update](alertsclient.md#update)

## Constructors

### constructor

• **new AlertsClient**(`__namedParameters`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [ConstructorOptions](../interfaces/constructoroptions.md) |

#### Defined in

[alerts_client.ts:117](https://github.com/elastic/kibana/blob/42f5a948210/x-pack/plugins/rule_registry/server/alert_data_client/alerts_client.ts#L117)

## Properties

### auditLogger

• `Private` `Optional` `Readonly` **auditLogger**: `AuditLogger`

#### Defined in

[alerts_client.ts:114](https://github.com/elastic/kibana/blob/42f5a948210/x-pack/plugins/rule_registry/server/alert_data_client/alerts_client.ts#L114)

___

### authorization

• `Private` `Readonly` **authorization**: `PublicMethodsOf`<AlertingAuthorization\>

#### Defined in

[alerts_client.ts:115](https://github.com/elastic/kibana/blob/42f5a948210/x-pack/plugins/rule_registry/server/alert_data_client/alerts_client.ts#L115)

___

### esClient

• `Private` `Readonly` **esClient**: `ElasticsearchClient`

#### Defined in

[alerts_client.ts:116](https://github.com/elastic/kibana/blob/42f5a948210/x-pack/plugins/rule_registry/server/alert_data_client/alerts_client.ts#L116)

___

### logger

• `Private` `Readonly` **logger**: `Logger`

#### Defined in

[alerts_client.ts:113](https://github.com/elastic/kibana/blob/42f5a948210/x-pack/plugins/rule_registry/server/alert_data_client/alerts_client.ts#L113)

___

### spaceId

• `Private` `Readonly` **spaceId**: `undefined` \| `string`

#### Defined in

[alerts_client.ts:117](https://github.com/elastic/kibana/blob/42f5a948210/x-pack/plugins/rule_registry/server/alert_data_client/alerts_client.ts#L117)

## Methods

### buildEsQueryWithAuthz

▸ `Private` **buildEsQueryWithAuthz**(`query`, `id`, `alertSpaceId`, `operation`, `config`): `Promise`<`Object`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `query` | `undefined` \| ``null`` \| `string` \| `object` |
| `id` | `undefined` \| ``null`` \| `string` |
| `alertSpaceId` | `string` |
| `operation` | `Update` \| `Get` \| `Find` |
| `config` | `EsQueryConfig` |

#### Returns

`Promise`<`Object`\>

#### Defined in

[alerts_client.ts:367](https://github.com/elastic/kibana/blob/42f5a948210/x-pack/plugins/rule_registry/server/alert_data_client/alerts_client.ts#L367)

___

### bulkUpdate

▸ **bulkUpdate**<Params\>(`__namedParameters`): `Promise`<ApiResponse<BulkResponse, unknown\> \| ApiResponse<UpdateByQueryResponse, unknown\>\>

#### Type parameters

| Name | Type |
| :------ | :------ |
| `Params` | `Params`: `RuleTypeParams` = `never` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [BulkUpdateOptions](../interfaces/bulkupdateoptions.md)<Params\> |

#### Returns

`Promise`<ApiResponse<BulkResponse, unknown\> \| ApiResponse<UpdateByQueryResponse, unknown\>\>

#### Defined in

[alerts_client.ts:570](https://github.com/elastic/kibana/blob/42f5a948210/x-pack/plugins/rule_registry/server/alert_data_client/alerts_client.ts#L570)

___

### ensureAllAuthorized

▸ `Private` **ensureAllAuthorized**(`items`, `operation`): `Promise`<(undefined \| void)[]\>

Accepts an array of ES documents and executes ensureAuthorized for the given operation

#### Parameters

| Name | Type |
| :------ | :------ |
| `items` | { `_id`: `string` ; `_source?`: ``null`` \| { `kibana.alert.rule.consumer?`: ``null`` \| `string` ; `kibana.alert.rule.rule_type_id?`: ``null`` \| `string`  }  }[] |
| `operation` | `Update` \| `Get` \| `Find` |

#### Returns

`Promise`<(undefined \| void)[]\>

#### Defined in

[alerts_client.ts:152](https://github.com/elastic/kibana/blob/42f5a948210/x-pack/plugins/rule_registry/server/alert_data_client/alerts_client.ts#L152)

___

### find

▸ **find**<Params\>(`__namedParameters`): `Promise`<SearchResponse<OutputOf<SetOptional<`Object`\>\>\>\>

#### Type parameters

| Name | Type |
| :------ | :------ |
| `Params` | `Params`: `RuleTypeParams` = `never` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | `Object` |
| `__namedParameters._source?` | `string`[] |
| `__namedParameters.aggs?` | `object` |
| `__namedParameters.index` | `undefined` \| `string` |
| `__namedParameters.query?` | `object` |
| `__namedParameters.size?` | `number` |
| `__namedParameters.track_total_hits?` | `boolean` |

#### Returns

`Promise`<SearchResponse<OutputOf<SetOptional<`Object`\>\>\>\>

#### Defined in

[alerts_client.ts:628](https://github.com/elastic/kibana/blob/42f5a948210/x-pack/plugins/rule_registry/server/alert_data_client/alerts_client.ts#L628)

___

### get

▸ **get**(`__namedParameters`): `Promise`<undefined \| OutputOf<SetOptional<`Object`\>\>\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | `GetAlertParams` |

#### Returns

`Promise`<undefined \| OutputOf<SetOptional<`Object`\>\>\>

#### Defined in

[alerts_client.ts:491](https://github.com/elastic/kibana/blob/42f5a948210/x-pack/plugins/rule_registry/server/alert_data_client/alerts_client.ts#L491)

___

### getAlertStatusFieldUpdate

▸ `Private` **getAlertStatusFieldUpdate**(`source`, `status`): { `kibana.alert.workflow_status`: `undefined` ; `signal`: { `status`: `STATUS\_VALUES`  }  } \| { `kibana.alert.workflow_status`: `STATUS\_VALUES` ; `signal`: `undefined`  }

#### Parameters

| Name | Type |
| :------ | :------ |
| `source` | `undefined` \| `OutputOf`<SetOptional<`Object`\>\> |
| `status` | `STATUS\_VALUES` |

#### Returns

{ `kibana.alert.workflow_status`: `undefined` ; `signal`: { `status`: `STATUS\_VALUES`  }  } \| { `kibana.alert.workflow_status`: `STATUS\_VALUES` ; `signal`: `undefined`  }

#### Defined in

[alerts_client.ts:137](https://github.com/elastic/kibana/blob/42f5a948210/x-pack/plugins/rule_registry/server/alert_data_client/alerts_client.ts#L137)

___

### getAuthorizedAlertsIndices

▸ **getAuthorizedAlertsIndices**(`featureIds`): `Promise`<undefined \| string[]\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `featureIds` | `string`[] |

#### Returns

`Promise`<undefined \| string[]\>

#### Defined in

[alerts_client.ts:674](https://github.com/elastic/kibana/blob/42f5a948210/x-pack/plugins/rule_registry/server/alert_data_client/alerts_client.ts#L674)

___

### getOutcome

▸ `Private` **getOutcome**(`operation`): `Object`

#### Parameters

| Name | Type |
| :------ | :------ |
| `operation` | `Update` \| `Get` \| `Find` |

#### Returns

`Object`

| Name | Type |
| :------ | :------ |
| `outcome` | `EcsEventOutcome` |

#### Defined in

[alerts_client.ts:129](https://github.com/elastic/kibana/blob/42f5a948210/x-pack/plugins/rule_registry/server/alert_data_client/alerts_client.ts#L129)

___

### mgetAlertsAuditOperate

▸ `Private` **mgetAlertsAuditOperate**(`__namedParameters`): `Promise`<ApiResponse<BulkResponse, unknown\>\>

When an update by ids is requested, do a multi-get, ensure authz and audit alerts, then execute bulk update

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | `Object` |
| `__namedParameters.ids` | `string`[] |
| `__namedParameters.indexName` | `string` |
| `__namedParameters.operation` | `Update` \| `Get` \| `Find` |
| `__namedParameters.status` | `STATUS\_VALUES` |

#### Returns

`Promise`<ApiResponse<BulkResponse, unknown\>\>

#### Defined in

[alerts_client.ts:308](https://github.com/elastic/kibana/blob/42f5a948210/x-pack/plugins/rule_registry/server/alert_data_client/alerts_client.ts#L308)

___

### queryAndAuditAllAlerts

▸ `Private` **queryAndAuditAllAlerts**(`__namedParameters`): `Promise`<undefined \| { `auditedAlerts`: `boolean` = true; `authorizedQuery`: { `bool`: { `must`: `object`[]  }  }  }\>

executes a search after to find alerts with query (+ authz filter)

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | `Object` |
| `__namedParameters.index` | `string` |
| `__namedParameters.operation` | `Update` \| `Get` \| `Find` |
| `__namedParameters.query` | `string` \| `object` |

#### Returns

`Promise`<undefined \| { `auditedAlerts`: `boolean` = true; `authorizedQuery`: { `bool`: { `must`: `object`[]  }  }  }\>

#### Defined in

[alerts_client.ts:423](https://github.com/elastic/kibana/blob/42f5a948210/x-pack/plugins/rule_registry/server/alert_data_client/alerts_client.ts#L423)

___

### singleSearchAfterAndAudit

▸ `Private` **singleSearchAfterAndAudit**(`__namedParameters`): `Promise`<SearchResponse<OutputOf<SetOptional<`Object`\>\>\>\>

This will be used as a part of the "find" api
In the future we will add an "aggs" param

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | `SingleSearchAfterAndAudit` |

#### Returns

`Promise`<SearchResponse<OutputOf<SetOptional<`Object`\>\>\>\>

#### Defined in

[alerts_client.ts:220](https://github.com/elastic/kibana/blob/42f5a948210/x-pack/plugins/rule_registry/server/alert_data_client/alerts_client.ts#L220)

___

### update

▸ **update**<Params\>(`__namedParameters`): `Promise`<`Object`\>

#### Type parameters

| Name | Type |
| :------ | :------ |
| `Params` | `Params`: `RuleTypeParams` = `never` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [UpdateOptions](../interfaces/updateoptions.md)<Params\> |

#### Returns

`Promise`<`Object`\>

#### Defined in

[alerts_client.ts:520](https://github.com/elastic/kibana/blob/42f5a948210/x-pack/plugins/rule_registry/server/alert_data_client/alerts_client.ts#L520)
