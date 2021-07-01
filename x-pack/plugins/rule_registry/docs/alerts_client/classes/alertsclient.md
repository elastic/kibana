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

### Methods

- [fetchAlert](alertsclient.md#fetchalert)
- [get](alertsclient.md#get)
- [getAlertsIndex](alertsclient.md#getalertsindex)
- [getAuthorizedAlertsIndices](alertsclient.md#getauthorizedalertsindices)
- [update](alertsclient.md#update)

## Constructors

### constructor

• **new AlertsClient**(`__namedParameters`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [ConstructorOptions](../interfaces/constructoroptions.md) |

#### Defined in

[rule_registry/server/alert_data_client/alerts_client.ts:59](https://github.com/dhurley14/kibana/blob/d2173f5090e/x-pack/plugins/rule_registry/server/alert_data_client/alerts_client.ts#L59)

## Properties

### auditLogger

• `Private` `Optional` `Readonly` **auditLogger**: `AuditLogger`

#### Defined in

[rule_registry/server/alert_data_client/alerts_client.ts:57](https://github.com/dhurley14/kibana/blob/d2173f5090e/x-pack/plugins/rule_registry/server/alert_data_client/alerts_client.ts#L57)

___

### authorization

• `Private` `Readonly` **authorization**: `PublicMethodsOf`<AlertingAuthorization\>

#### Defined in

[rule_registry/server/alert_data_client/alerts_client.ts:58](https://github.com/dhurley14/kibana/blob/d2173f5090e/x-pack/plugins/rule_registry/server/alert_data_client/alerts_client.ts#L58)

___

### esClient

• `Private` `Readonly` **esClient**: `ElasticsearchClient`

#### Defined in

[rule_registry/server/alert_data_client/alerts_client.ts:59](https://github.com/dhurley14/kibana/blob/d2173f5090e/x-pack/plugins/rule_registry/server/alert_data_client/alerts_client.ts#L59)

___

### logger

• `Private` `Readonly` **logger**: `Logger`

#### Defined in

[rule_registry/server/alert_data_client/alerts_client.ts:56](https://github.com/dhurley14/kibana/blob/d2173f5090e/x-pack/plugins/rule_registry/server/alert_data_client/alerts_client.ts#L56)

## Methods

### fetchAlert

▸ `Private` **fetchAlert**(`__namedParameters`): `Promise`<AlertType\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | `GetAlertParams` |

#### Returns

`Promise`<AlertType\>

#### Defined in

[rule_registry/server/alert_data_client/alerts_client.ts:79](https://github.com/dhurley14/kibana/blob/d2173f5090e/x-pack/plugins/rule_registry/server/alert_data_client/alerts_client.ts#L79)

___

### get

▸ **get**(`__namedParameters`): `Promise`<OutputOf<SetOptional<`Object`\>\>\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | `GetAlertParams` |

#### Returns

`Promise`<OutputOf<SetOptional<`Object`\>\>\>

#### Defined in

[rule_registry/server/alert_data_client/alerts_client.ts:108](https://github.com/dhurley14/kibana/blob/d2173f5090e/x-pack/plugins/rule_registry/server/alert_data_client/alerts_client.ts#L108)

___

### getAlertsIndex

▸ **getAlertsIndex**(`featureIds`, `operations`): `Promise`<`Object`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `featureIds` | `string`[] |
| `operations` | (`ReadOperations` \| `WriteOperations`)[] |

#### Returns

`Promise`<`Object`\>

#### Defined in

[rule_registry/server/alert_data_client/alerts_client.ts:68](https://github.com/dhurley14/kibana/blob/d2173f5090e/x-pack/plugins/rule_registry/server/alert_data_client/alerts_client.ts#L68)

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

[rule_registry/server/alert_data_client/alerts_client.ts:200](https://github.com/dhurley14/kibana/blob/d2173f5090e/x-pack/plugins/rule_registry/server/alert_data_client/alerts_client.ts#L200)

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

[rule_registry/server/alert_data_client/alerts_client.ts:146](https://github.com/dhurley14/kibana/blob/d2173f5090e/x-pack/plugins/rule_registry/server/alert_data_client/alerts_client.ts#L146)
