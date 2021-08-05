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
- [fetchAlertAndAudit](alertsclient.md#fetchalertandaudit)
- [fetchAlertAuditOperate](alertsclient.md#fetchalertauditoperate)
- [get](alertsclient.md#get)
- [getAuthorizedAlertsIndices](alertsclient.md#getauthorizedalertsindices)
- [queryAndAuditAllAlerts](alertsclient.md#queryandauditallalerts)
- [update](alertsclient.md#update)

## Constructors

### constructor

• **new AlertsClient**(`__namedParameters`)

#### Parameters

| Name                | Type                                                      |
| :------------------ | :-------------------------------------------------------- |
| `__namedParameters` | [ConstructorOptions](../interfaces/constructoroptions.md) |

#### Defined in

[alerts_client.ts:90](https://github.com/elastic/kibana/blob/84a50dc4bb6/x-pack/plugins/rule_registry/server/alert_data_client/alerts_client.ts#L90)

## Properties

### auditLogger

• `Private` `Optional` `Readonly` **auditLogger**: `AuditLogger`

#### Defined in

[alerts_client.ts:87](https://github.com/elastic/kibana/blob/84a50dc4bb6/x-pack/plugins/rule_registry/server/alert_data_client/alerts_client.ts#L87)

---

### authorization

• `Private` `Readonly` **authorization**: `PublicMethodsOf`<AlertingAuthorization\>

#### Defined in

[alerts_client.ts:88](https://github.com/elastic/kibana/blob/84a50dc4bb6/x-pack/plugins/rule_registry/server/alert_data_client/alerts_client.ts#L88)

---

### esClient

• `Private` `Readonly` **esClient**: `ElasticsearchClient`

#### Defined in

[alerts_client.ts:89](https://github.com/elastic/kibana/blob/84a50dc4bb6/x-pack/plugins/rule_registry/server/alert_data_client/alerts_client.ts#L89)

---

### logger

• `Private` `Readonly` **logger**: `Logger`

#### Defined in

[alerts_client.ts:86](https://github.com/elastic/kibana/blob/84a50dc4bb6/x-pack/plugins/rule_registry/server/alert_data_client/alerts_client.ts#L86)

---

### spaceId

• `Private` `Readonly` **spaceId**: `undefined` \| `string`

#### Defined in

[alerts_client.ts:90](https://github.com/elastic/kibana/blob/84a50dc4bb6/x-pack/plugins/rule_registry/server/alert_data_client/alerts_client.ts#L90)

## Methods

### buildEsQueryWithAuthz

▸ `Private` **buildEsQueryWithAuthz**(`query`, `id`, `alertSpaceId`, `operation`, `config`): `Promise`<`Object`\>

#### Parameters

| Name           | Type                              |
| :------------- | :-------------------------------- |
| `query`        | `undefined` \| `null` \| `string` |
| `id`           | `undefined` \| `null` \| `string` |
| `alertSpaceId` | `string`                          |
| `operation`    | `Update` \| `Get` \| `Find`       |
| `config`       | `EsQueryConfig`                   |

#### Returns

`Promise`<`Object`\>

#### Defined in

[alerts_client.ts:242](https://github.com/elastic/kibana/blob/84a50dc4bb6/x-pack/plugins/rule_registry/server/alert_data_client/alerts_client.ts#L242)

---

### bulkUpdate

▸ **bulkUpdate**<Params\>(`__namedParameters`): `Promise`<ApiResponse<BulkResponse, unknown\> \| ApiResponse<UpdateByQueryResponse, unknown\>\>

#### Type parameters

| Name     | Type                                  |
| :------- | :------------------------------------ |
| `Params` | `Params`: `AlertTypeParams` = `never` |

#### Parameters

| Name                | Type                                                             |
| :------------------ | :--------------------------------------------------------------- |
| `__namedParameters` | [BulkUpdateOptions](../interfaces/bulkupdateoptions.md)<Params\> |

#### Returns

`Promise`<ApiResponse<BulkResponse, unknown\> \| ApiResponse<UpdateByQueryResponse, unknown\>\>

#### Defined in

[alerts_client.ts:424](https://github.com/elastic/kibana/blob/84a50dc4bb6/x-pack/plugins/rule_registry/server/alert_data_client/alerts_client.ts#L424)

---

### fetchAlertAndAudit

▸ `Private` **fetchAlertAndAudit**(`__namedParameters`): `Promise`<SearchResponse<OutputOf<SetOptional<`Object`\>\>\>\>

This will be used as a part of the "find" api
In the future we will add an "aggs" param

#### Parameters

| Name                | Type                       |
| :------------------ | :------------------------- |
| `__namedParameters` | `FetchAndAuditAlertParams` |

#### Returns

`Promise`<SearchResponse<OutputOf<SetOptional<`Object`\>\>\>\>

#### Defined in

[alerts_client.ts:108](https://github.com/elastic/kibana/blob/84a50dc4bb6/x-pack/plugins/rule_registry/server/alert_data_client/alerts_client.ts#L108)

---

### fetchAlertAuditOperate

▸ `Private` **fetchAlertAuditOperate**(`__namedParameters`): `Promise`<ApiResponse<BulkResponse, unknown\>\>

When an update by ids is requested, do a multi-get, ensure authz and audit alerts, then execute bulk update

#### Parameters

| Name                          | Type                                  |
| :---------------------------- | :------------------------------------ |
| `__namedParameters`           | `Object`                              |
| `__namedParameters.ids`       | `string`[]                            |
| `__namedParameters.indexName` | `string`                              |
| `__namedParameters.operation` | `WriteOperations` \| `ReadOperations` |
| `__namedParameters.status`    | `STATUS\_VALUES`                      |

#### Returns

`Promise`<ApiResponse<BulkResponse, unknown\>\>

#### Defined in

[alerts_client.ts:185](https://github.com/elastic/kibana/blob/84a50dc4bb6/x-pack/plugins/rule_registry/server/alert_data_client/alerts_client.ts#L185)

---

### get

▸ **get**(`__namedParameters`): `Promise`<undefined \| OutputOf<SetOptional<`Object`\>\>\>

#### Parameters

| Name                | Type             |
| :------------------ | :--------------- |
| `__namedParameters` | `GetAlertParams` |

#### Returns

`Promise`<undefined \| OutputOf<SetOptional<`Object`\>\>\>

#### Defined in

[alerts_client.ts:344](https://github.com/elastic/kibana/blob/84a50dc4bb6/x-pack/plugins/rule_registry/server/alert_data_client/alerts_client.ts#L344)

---

### getAuthorizedAlertsIndices

▸ **getAuthorizedAlertsIndices**(`featureIds`): `Promise`<undefined \| string[]\>

#### Parameters

| Name         | Type       |
| :----------- | :--------- |
| `featureIds` | `string`[] |

#### Returns

`Promise`<undefined \| string[]\>

#### Defined in

[alerts_client.ts:481](https://github.com/elastic/kibana/blob/84a50dc4bb6/x-pack/plugins/rule_registry/server/alert_data_client/alerts_client.ts#L481)

---

### queryAndAuditAllAlerts

▸ `Private` **queryAndAuditAllAlerts**(`__namedParameters`): `Promise`<undefined \| { `auditedAlerts`: `boolean` = true; `authorizedQuery`: {} }\>

executes a search after to find alerts with query (+ authz filter)

#### Parameters

| Name                          | Type                        |
| :---------------------------- | :-------------------------- |
| `__namedParameters`           | `Object`                    |
| `__namedParameters.index`     | `string`                    |
| `__namedParameters.operation` | `Update` \| `Get` \| `Find` |
| `__namedParameters.query`     | `string`                    |

#### Returns

`Promise`<undefined \| { `auditedAlerts`: `boolean` = true; `authorizedQuery`: {} }\>

#### Defined in

[alerts_client.ts:280](https://github.com/elastic/kibana/blob/84a50dc4bb6/x-pack/plugins/rule_registry/server/alert_data_client/alerts_client.ts#L280)

---

### update

▸ **update**<Params\>(`__namedParameters`): `Promise`<`Object`\>

#### Type parameters

| Name     | Type                                  |
| :------- | :------------------------------------ |
| `Params` | `Params`: `AlertTypeParams` = `never` |

#### Parameters

| Name                | Type                                                     |
| :------------------ | :------------------------------------------------------- |
| `__namedParameters` | [UpdateOptions](../interfaces/updateoptions.md)<Params\> |

#### Returns

`Promise`<`Object`\>

#### Defined in

[alerts_client.ts:375](https://github.com/elastic/kibana/blob/84a50dc4bb6/x-pack/plugins/rule_registry/server/alert_data_client/alerts_client.ts#L375)
