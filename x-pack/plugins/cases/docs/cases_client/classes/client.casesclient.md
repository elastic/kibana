[Cases Client API Interface](../README.md) / [client](../modules/client.md) / CasesClient

# Class: CasesClient

[client](../modules/client.md).CasesClient

Client wrapper that contains accessor methods for individual entities within the cases system.

## Table of contents

### Constructors

- [constructor](client.CasesClient.md#constructor)

### Properties

- [\_attachments](client.CasesClient.md#_attachments)
- [\_cases](client.CasesClient.md#_cases)
- [\_casesClientInternal](client.CasesClient.md#_casesclientinternal)
- [\_configure](client.CasesClient.md#_configure)
- [\_metrics](client.CasesClient.md#_metrics)
- [\_stats](client.CasesClient.md#_stats)
- [\_userActions](client.CasesClient.md#_useractions)

### Accessors

- [attachments](client.CasesClient.md#attachments)
- [cases](client.CasesClient.md#cases)
- [configure](client.CasesClient.md#configure)
- [metrics](client.CasesClient.md#metrics)
- [stats](client.CasesClient.md#stats)
- [userActions](client.CasesClient.md#useractions)

## Constructors

### constructor

• **new CasesClient**(`args`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `args` | [`CasesClientArgs`](../interfaces/client._internal_namespace.CasesClientArgs.md) |

#### Defined in

[x-pack/plugins/cases/server/client/client.ts:29](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/client/client.ts#L29)

## Properties

### \_attachments

• `Private` `Readonly` **\_attachments**: [`AttachmentsSubClient`](../interfaces/attachments_client.AttachmentsSubClient.md)

#### Defined in

[x-pack/plugins/cases/server/client/client.ts:23](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/client/client.ts#L23)

___

### \_cases

• `Private` `Readonly` **\_cases**: [`CasesSubClient`](../interfaces/cases_client.CasesSubClient.md)

#### Defined in

[x-pack/plugins/cases/server/client/client.ts:22](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/client/client.ts#L22)

___

### \_casesClientInternal

• `Private` `Readonly` **\_casesClientInternal**: [`CasesClientInternal`](client._internal_namespace.CasesClientInternal.md)

#### Defined in

[x-pack/plugins/cases/server/client/client.ts:21](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/client/client.ts#L21)

___

### \_configure

• `Private` `Readonly` **\_configure**: [`ConfigureSubClient`](../interfaces/configure_client.ConfigureSubClient.md)

#### Defined in

[x-pack/plugins/cases/server/client/client.ts:25](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/client/client.ts#L25)

___

### \_metrics

• `Private` `Readonly` **\_metrics**: [`MetricsSubClient`](../interfaces/metrics_client.MetricsSubClient.md)

#### Defined in

[x-pack/plugins/cases/server/client/client.ts:27](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/client/client.ts#L27)

___

### \_stats

• `Private` `Readonly` **\_stats**: [`StatsSubClient`](../interfaces/stats_client.StatsSubClient.md)

#### Defined in

[x-pack/plugins/cases/server/client/client.ts:26](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/client/client.ts#L26)

___

### \_userActions

• `Private` `Readonly` **\_userActions**: [`UserActionsSubClient`](../interfaces/user_actions_client.UserActionsSubClient.md)

#### Defined in

[x-pack/plugins/cases/server/client/client.ts:24](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/client/client.ts#L24)

## Accessors

### attachments

• `get` **attachments**(): [`AttachmentsSubClient`](../interfaces/attachments_client.AttachmentsSubClient.md)

Retrieves an interface for interacting with attachments (comments) entities.

#### Returns

[`AttachmentsSubClient`](../interfaces/attachments_client.AttachmentsSubClient.md)

#### Defined in

[x-pack/plugins/cases/server/client/client.ts:49](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/client/client.ts#L49)

___

### cases

• `get` **cases**(): [`CasesSubClient`](../interfaces/cases_client.CasesSubClient.md)

Retrieves an interface for interacting with cases entities.

#### Returns

[`CasesSubClient`](../interfaces/cases_client.CasesSubClient.md)

#### Defined in

[x-pack/plugins/cases/server/client/client.ts:42](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/client/client.ts#L42)

___

### configure

• `get` **configure**(): [`ConfigureSubClient`](../interfaces/configure_client.ConfigureSubClient.md)

Retrieves an interface for interacting with the configuration of external connectors for the plugin entities.

#### Returns

[`ConfigureSubClient`](../interfaces/configure_client.ConfigureSubClient.md)

#### Defined in

[x-pack/plugins/cases/server/client/client.ts:63](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/client/client.ts#L63)

___

### metrics

• `get` **metrics**(): [`MetricsSubClient`](../interfaces/metrics_client.MetricsSubClient.md)

Retrieves an interface for retrieving metrics related to the cases entities.

#### Returns

[`MetricsSubClient`](../interfaces/metrics_client.MetricsSubClient.md)

#### Defined in

[x-pack/plugins/cases/server/client/client.ts:77](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/client/client.ts#L77)

___

### stats

• `get` **stats**(): [`StatsSubClient`](../interfaces/stats_client.StatsSubClient.md)

Retrieves an interface for retrieving statistics related to the cases entities.

#### Returns

[`StatsSubClient`](../interfaces/stats_client.StatsSubClient.md)

#### Defined in

[x-pack/plugins/cases/server/client/client.ts:70](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/client/client.ts#L70)

___

### userActions

• `get` **userActions**(): [`UserActionsSubClient`](../interfaces/user_actions_client.UserActionsSubClient.md)

Retrieves an interface for interacting with the user actions associated with the plugin entities.

#### Returns

[`UserActionsSubClient`](../interfaces/user_actions_client.UserActionsSubClient.md)

#### Defined in

[x-pack/plugins/cases/server/client/client.ts:56](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/client/client.ts#L56)
