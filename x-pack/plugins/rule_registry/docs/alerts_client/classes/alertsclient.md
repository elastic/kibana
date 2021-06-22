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
- [ruleDataService](alertsclient.md#ruledataservice)

### Methods

- [fetchAlert](alertsclient.md#fetchalert)
- [get](alertsclient.md#get)
- [getAlertsIndex](alertsclient.md#getalertsindex)
- [getFullAssetName](alertsclient.md#getfullassetname)
- [update](alertsclient.md#update)

## Constructors

### constructor

• **new AlertsClient**(`__namedParameters`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [ConstructorOptions](../interfaces/constructoroptions.md) |

#### Defined in

[alerts_client.ts:56](https://github.com/dhurley14/kibana/blob/25bf227f8c6/x-pack/plugins/rule_registry/server/alert_data_client/alerts_client.ts#L56)

## Properties

### auditLogger

• `Private` `Optional` `Readonly` **auditLogger**: `AuditLogger`

#### Defined in

[alerts_client.ts:53](https://github.com/dhurley14/kibana/blob/25bf227f8c6/x-pack/plugins/rule_registry/server/alert_data_client/alerts_client.ts#L53)

___

### authorization

• `Private` `Readonly` **authorization**: `PublicMethodsOf`<AlertingAuthorization\>

#### Defined in

[alerts_client.ts:54](https://github.com/dhurley14/kibana/blob/25bf227f8c6/x-pack/plugins/rule_registry/server/alert_data_client/alerts_client.ts#L54)

___

### esClient

• `Private` `Readonly` **esClient**: `ElasticsearchClient`

#### Defined in

[alerts_client.ts:55](https://github.com/dhurley14/kibana/blob/25bf227f8c6/x-pack/plugins/rule_registry/server/alert_data_client/alerts_client.ts#L55)

___

### logger

• `Private` `Readonly` **logger**: `Logger`

#### Defined in

[alerts_client.ts:52](https://github.com/dhurley14/kibana/blob/25bf227f8c6/x-pack/plugins/rule_registry/server/alert_data_client/alerts_client.ts#L52)

___

### ruleDataService

• `Private` `Readonly` **ruleDataService**: `PublicMethodsOf`<RuleDataPluginService\>

#### Defined in

[alerts_client.ts:56](https://github.com/dhurley14/kibana/blob/25bf227f8c6/x-pack/plugins/rule_registry/server/alert_data_client/alerts_client.ts#L56)

## Methods

### fetchAlert

▸ `Private` **fetchAlert**(`__namedParameters`): `Promise`<OutputOf<SetOptional<`Object`\>\>\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | `GetAlertParams` |

#### Returns

`Promise`<OutputOf<SetOptional<`Object`\>\>\>

#### Defined in

[alerts_client.ts:83](https://github.com/dhurley14/kibana/blob/25bf227f8c6/x-pack/plugins/rule_registry/server/alert_data_client/alerts_client.ts#L83)

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

[alerts_client.ts:108](https://github.com/dhurley14/kibana/blob/25bf227f8c6/x-pack/plugins/rule_registry/server/alert_data_client/alerts_client.ts#L108)

___

### getAlertsIndex

▸ **getAlertsIndex**(`featureIds`): `Promise`<undefined \| string[]\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `featureIds` | `string`[] |

#### Returns

`Promise`<undefined \| string[]\>

#### Defined in

[alerts_client.ts:76](https://github.com/dhurley14/kibana/blob/25bf227f8c6/x-pack/plugins/rule_registry/server/alert_data_client/alerts_client.ts#L76)

___

### getFullAssetName

▸ **getFullAssetName**(): `string`

#### Returns

`string`

#### Defined in

[alerts_client.ts:72](https://github.com/dhurley14/kibana/blob/25bf227f8c6/x-pack/plugins/rule_registry/server/alert_data_client/alerts_client.ts#L72)

___

### update

▸ **update**<Params\>(`__namedParameters`): `Promise`<undefined \| ``null`` \| OutputOf<SetOptional<`Object`\>\>\>

#### Type parameters

| Name | Type |
| :------ | :------ |
| `Params` | `Params`: `AlertTypeParams` = `never` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [UpdateOptions](../interfaces/updateoptions.md)<Params\> |

#### Returns

`Promise`<undefined \| ``null`` \| OutputOf<SetOptional<`Object`\>\>\>

#### Defined in

[alerts_client.ts:146](https://github.com/dhurley14/kibana/blob/25bf227f8c6/x-pack/plugins/rule_registry/server/alert_data_client/alerts_client.ts#L146)
