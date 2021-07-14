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

[rule_registry/server/alert_data_client/alerts_client.ts:67](https://github.com/dhurley14/kibana/blob/cd896fac629/x-pack/plugins/rule_registry/server/alert_data_client/alerts_client.ts#L67)

## Properties

### auditLogger

• `Private` `Optional` `Readonly` **auditLogger**: `AuditLogger`

#### Defined in

[rule_registry/server/alert_data_client/alerts_client.ts:64](https://github.com/dhurley14/kibana/blob/cd896fac629/x-pack/plugins/rule_registry/server/alert_data_client/alerts_client.ts#L64)

___

### authorization

• `Private` `Readonly` **authorization**: `PublicMethodsOf`<AlertingAuthorization\>

#### Defined in

[rule_registry/server/alert_data_client/alerts_client.ts:65](https://github.com/dhurley14/kibana/blob/cd896fac629/x-pack/plugins/rule_registry/server/alert_data_client/alerts_client.ts#L65)

___

### esClient

• `Private` `Readonly` **esClient**: `ElasticsearchClient`

#### Defined in

[rule_registry/server/alert_data_client/alerts_client.ts:66](https://github.com/dhurley14/kibana/blob/cd896fac629/x-pack/plugins/rule_registry/server/alert_data_client/alerts_client.ts#L66)

___

### logger

• `Private` `Readonly` **logger**: `Logger`

#### Defined in

[rule_registry/server/alert_data_client/alerts_client.ts:63](https://github.com/dhurley14/kibana/blob/cd896fac629/x-pack/plugins/rule_registry/server/alert_data_client/alerts_client.ts#L63)

___

### spaceId

• `Private` `Readonly` **spaceId**: `Promise`<undefined \| string\>

#### Defined in

[rule_registry/server/alert_data_client/alerts_client.ts:67](https://github.com/dhurley14/kibana/blob/cd896fac629/x-pack/plugins/rule_registry/server/alert_data_client/alerts_client.ts#L67)

## Methods

### fetchAlert

▸ `Private` **fetchAlert**(`__namedParameters`): `Promise`<undefined \| ``null`` \| `Omit`<OutputOf<SetOptional<`Object`\>\>, ``"kibana.rac.alert.owner"`` \| ``"rule.id"``\> & { `kibana.rac.alert.owner`: `string` ; `rule.id`: `string`  } & { `_version`: `undefined` \| `string`  }\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | `GetAlertParams` |

#### Returns

`Promise`<undefined \| ``null`` \| `Omit`<OutputOf<SetOptional<`Object`\>\>, ``"kibana.rac.alert.owner"`` \| ``"rule.id"``\> & { `kibana.rac.alert.owner`: `string` ; `rule.id`: `string`  } & { `_version`: `undefined` \| `string`  }\>

#### Defined in

[rule_registry/server/alert_data_client/alerts_client.ts:88](https://github.com/dhurley14/kibana/blob/cd896fac629/x-pack/plugins/rule_registry/server/alert_data_client/alerts_client.ts#L88)

___

### get

▸ **get**(`__namedParameters`): `Promise`<undefined \| ``null`` \| OutputOf<SetOptional<`Object`\>\>\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | `GetAlertParams` |

#### Returns

`Promise`<undefined \| ``null`` \| OutputOf<SetOptional<`Object`\>\>\>

#### Defined in

[rule_registry/server/alert_data_client/alerts_client.ts:142](https://github.com/dhurley14/kibana/blob/cd896fac629/x-pack/plugins/rule_registry/server/alert_data_client/alerts_client.ts#L142)

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

[rule_registry/server/alert_data_client/alerts_client.ts:77](https://github.com/dhurley14/kibana/blob/cd896fac629/x-pack/plugins/rule_registry/server/alert_data_client/alerts_client.ts#L77)

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

[rule_registry/server/alert_data_client/alerts_client.ts:246](https://github.com/dhurley14/kibana/blob/cd896fac629/x-pack/plugins/rule_registry/server/alert_data_client/alerts_client.ts#L246)

___

### update

▸ **update**<Params\>(`__namedParameters`): `Promise`<undefined \| { `_version`: `undefined` \| `string`  }\>

#### Type parameters

| Name | Type |
| :------ | :------ |
| `Params` | `Params`: `AlertTypeParams` = `never` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [UpdateOptions](../interfaces/updateoptions.md)<Params\> |

#### Returns

`Promise`<undefined \| { `_version`: `undefined` \| `string`  }\>

#### Defined in

[rule_registry/server/alert_data_client/alerts_client.ts:187](https://github.com/dhurley14/kibana/blob/cd896fac629/x-pack/plugins/rule_registry/server/alert_data_client/alerts_client.ts#L187)
