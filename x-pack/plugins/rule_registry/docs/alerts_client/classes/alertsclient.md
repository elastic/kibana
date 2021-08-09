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
- [get](alertsclient.md#get)
- [getAuthorizedAlertsIndices](alertsclient.md#getauthorizedalertsindices)
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

[alerts_client.ts:93](https://github.com/elastic/kibana/blob/daf6871ba4b/x-pack/plugins/rule_registry/server/alert_data_client/alerts_client.ts#L93)

## Properties

### auditLogger

• `Private` `Optional` `Readonly` **auditLogger**: `AuditLogger`

#### Defined in

[alerts_client.ts:90](https://github.com/elastic/kibana/blob/daf6871ba4b/x-pack/plugins/rule_registry/server/alert_data_client/alerts_client.ts#L90)

___

### authorization

• `Private` `Readonly` **authorization**: `PublicMethodsOf`<AlertingAuthorization\>

#### Defined in

[alerts_client.ts:91](https://github.com/elastic/kibana/blob/daf6871ba4b/x-pack/plugins/rule_registry/server/alert_data_client/alerts_client.ts#L91)

___

### esClient

• `Private` `Readonly` **esClient**: `ElasticsearchClient`

#### Defined in

[alerts_client.ts:92](https://github.com/elastic/kibana/blob/daf6871ba4b/x-pack/plugins/rule_registry/server/alert_data_client/alerts_client.ts#L92)

___

### logger

• `Private` `Readonly` **logger**: `Logger`

#### Defined in

[alerts_client.ts:89](https://github.com/elastic/kibana/blob/daf6871ba4b/x-pack/plugins/rule_registry/server/alert_data_client/alerts_client.ts#L89)

___

### spaceId

• `Private` `Readonly` **spaceId**: `undefined` \| `string`

#### Defined in

[alerts_client.ts:93](https://github.com/elastic/kibana/blob/daf6871ba4b/x-pack/plugins/rule_registry/server/alert_data_client/alerts_client.ts#L93)

## Methods

### buildEsQueryWithAuthz

▸ `Private` **buildEsQueryWithAuthz**(`query`, `id`, `alertSpaceId`, `operation`, `config`): `Promise`<`Object`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `query` | `undefined` \| ``null`` \| `string` |
| `id` | `undefined` \| ``null`` \| `string` |
| `alertSpaceId` | `string` |
| `operation` | `Get` \| `Find` \| `Update` |
| `config` | `EsQueryConfig` |

#### Returns

`Promise`<`Object`\>

#### Defined in

[alerts_client.ts:305](https://github.com/elastic/kibana/blob/daf6871ba4b/x-pack/plugins/rule_registry/server/alert_data_client/alerts_client.ts#L305)

___

### bulkUpdate

▸ **bulkUpdate**<Params\>(`__namedParameters`): `Promise`<ApiResponse<BulkResponse, unknown\> \| ApiResponse<UpdateByQueryResponse, unknown\>\>

#### Type parameters

| Name | Type |
| :------ | :------ |
| `Params` | `Params`: `AlertTypeParams` = `never` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [BulkUpdateOptions](../interfaces/bulkupdateoptions.md)<Params\> |

#### Returns

`Promise`<ApiResponse<BulkResponse, unknown\> \| ApiResponse<UpdateByQueryResponse, unknown\>\>

#### Defined in

[alerts_client.ts:475](https://github.com/elastic/kibana/blob/daf6871ba4b/x-pack/plugins/rule_registry/server/alert_data_client/alerts_client.ts#L475)

___

### ensureAllAuthorized

▸ `Private` **ensureAllAuthorized**(`items`, `operation`): `Promise`<(undefined \| void)[]\>

Accepts an array of ES documents and executes ensureAuthorized for the given operation

#### Parameters

| Name | Type |
| :------ | :------ |
| `items` | { `_id`: `string` ; `_source?`: ``null`` \| { `kibana.alert.owner?`: ``null`` \| `string` ; `rule.id?`: ``null`` \| `string`  }  }[] |
| `operation` | `Get` \| `Find` \| `Update` |

#### Returns

`Promise`<(undefined \| void)[]\>

#### Defined in

[alerts_client.ts:111](https://github.com/elastic/kibana/blob/daf6871ba4b/x-pack/plugins/rule_registry/server/alert_data_client/alerts_client.ts#L111)

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

[alerts_client.ts:407](https://github.com/elastic/kibana/blob/daf6871ba4b/x-pack/plugins/rule_registry/server/alert_data_client/alerts_client.ts#L407)

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

[alerts_client.ts:533](https://github.com/elastic/kibana/blob/daf6871ba4b/x-pack/plugins/rule_registry/server/alert_data_client/alerts_client.ts#L533)

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
| `__namedParameters.operation` | `Get` \| `Find` \| `Update` |
| `__namedParameters.status` | `STATUS\_VALUES` |

#### Returns

`Promise`<ApiResponse<BulkResponse, unknown\>\>

#### Defined in

[alerts_client.ts:252](https://github.com/elastic/kibana/blob/daf6871ba4b/x-pack/plugins/rule_registry/server/alert_data_client/alerts_client.ts#L252)

___

### queryAndAuditAllAlerts

▸ `Private` **queryAndAuditAllAlerts**(`__namedParameters`): `Promise`<undefined \| { `auditedAlerts`: `boolean` = true; `authorizedQuery`: {}  }\>

executes a search after to find alerts with query (+ authz filter)

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | `Object` |
| `__namedParameters.index` | `string` |
| `__namedParameters.operation` | `Get` \| `Find` \| `Update` |
| `__namedParameters.query` | `string` |

#### Returns

`Promise`<undefined \| { `auditedAlerts`: `boolean` = true; `authorizedQuery`: {}  }\>

#### Defined in

[alerts_client.ts:343](https://github.com/elastic/kibana/blob/daf6871ba4b/x-pack/plugins/rule_registry/server/alert_data_client/alerts_client.ts#L343)

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

[alerts_client.ts:176](https://github.com/elastic/kibana/blob/daf6871ba4b/x-pack/plugins/rule_registry/server/alert_data_client/alerts_client.ts#L176)

___

### update

▸ **update**<Params\>(`__namedParameters`): `Promise`<`Object`\>

#### Type parameters

| Name | Type |
| :------ | :------ |
| `Params` | `Params`: `AlertTypeParams` = `never` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [UpdateOptions](../interfaces/updateoptions.md)<Params\> |

#### Returns

`Promise`<`Object`\>

#### Defined in

[alerts_client.ts:432](https://github.com/elastic/kibana/blob/daf6871ba4b/x-pack/plugins/rule_registry/server/alert_data_client/alerts_client.ts#L432)
