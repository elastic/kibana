[Cases Client API Interface](../cases_client_api.md) / [client](../modules/client.md) / CasesClient

# Class: CasesClient

[client](../modules/client.md).CasesClient

Client wrapper that contains accessor methods for individual entities within the cases system.

## Table of contents

### Constructors

- [constructor](client.casesclient.md#constructor)

### Properties

- [\_attachments](client.casesclient.md#_attachments)
- [\_cases](client.casesclient.md#_cases)
- [\_casesClientInternal](client.casesclient.md#_casesclientinternal)
- [\_configure](client.casesclient.md#_configure)
- [\_stats](client.casesclient.md#_stats)
- [\_subCases](client.casesclient.md#_subcases)
- [\_userActions](client.casesclient.md#_useractions)

### Accessors

- [attachments](client.casesclient.md#attachments)
- [cases](client.casesclient.md#cases)
- [configure](client.casesclient.md#configure)
- [stats](client.casesclient.md#stats)
- [subCases](client.casesclient.md#subcases)
- [userActions](client.casesclient.md#useractions)

## Constructors

### constructor

\+ **new CasesClient**(`args`: CasesClientArgs): [*CasesClient*](client.casesclient.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `args` | CasesClientArgs |

**Returns:** [*CasesClient*](client.casesclient.md)

Defined in: [client.ts:28](https://github.com/elastic/kibana/blob/a80791aa4cc/x-pack/plugins/cases/server/client/client.ts#L28)

## Properties

### \_attachments

• `Private` `Readonly` **\_attachments**: [*AttachmentsSubClient*](../interfaces/attachments_client.attachmentssubclient.md)

Defined in: [client.ts:24](https://github.com/elastic/kibana/blob/a80791aa4cc/x-pack/plugins/cases/server/client/client.ts#L24)

___

### \_cases

• `Private` `Readonly` **\_cases**: [*CasesSubClient*](../interfaces/cases_client.casessubclient.md)

Defined in: [client.ts:23](https://github.com/elastic/kibana/blob/a80791aa4cc/x-pack/plugins/cases/server/client/client.ts#L23)

___

### \_casesClientInternal

• `Private` `Readonly` **\_casesClientInternal**: *CasesClientInternal*

Defined in: [client.ts:22](https://github.com/elastic/kibana/blob/a80791aa4cc/x-pack/plugins/cases/server/client/client.ts#L22)

___

### \_configure

• `Private` `Readonly` **\_configure**: [*ConfigureSubClient*](../interfaces/configure_client.configuresubclient.md)

Defined in: [client.ts:27](https://github.com/elastic/kibana/blob/a80791aa4cc/x-pack/plugins/cases/server/client/client.ts#L27)

___

### \_stats

• `Private` `Readonly` **\_stats**: [*StatsSubClient*](../interfaces/stats_client.statssubclient.md)

Defined in: [client.ts:28](https://github.com/elastic/kibana/blob/a80791aa4cc/x-pack/plugins/cases/server/client/client.ts#L28)

___

### \_subCases

• `Private` `Readonly` **\_subCases**: [*SubCasesClient*](../interfaces/sub_cases_client.subcasesclient.md)

Defined in: [client.ts:26](https://github.com/elastic/kibana/blob/a80791aa4cc/x-pack/plugins/cases/server/client/client.ts#L26)

___

### \_userActions

• `Private` `Readonly` **\_userActions**: [*UserActionsSubClient*](../interfaces/user_actions_client.useractionssubclient.md)

Defined in: [client.ts:25](https://github.com/elastic/kibana/blob/a80791aa4cc/x-pack/plugins/cases/server/client/client.ts#L25)

## Accessors

### attachments

• get **attachments**(): [*AttachmentsSubClient*](../interfaces/attachments_client.attachmentssubclient.md)

Retrieves an interface for interacting with attachments (comments) entities.

**Returns:** [*AttachmentsSubClient*](../interfaces/attachments_client.attachmentssubclient.md)

Defined in: [client.ts:50](https://github.com/elastic/kibana/blob/a80791aa4cc/x-pack/plugins/cases/server/client/client.ts#L50)

___

### cases

• get **cases**(): [*CasesSubClient*](../interfaces/cases_client.casessubclient.md)

Retrieves an interface for interacting with cases entities.

**Returns:** [*CasesSubClient*](../interfaces/cases_client.casessubclient.md)

Defined in: [client.ts:43](https://github.com/elastic/kibana/blob/a80791aa4cc/x-pack/plugins/cases/server/client/client.ts#L43)

___

### configure

• get **configure**(): [*ConfigureSubClient*](../interfaces/configure_client.configuresubclient.md)

Retrieves an interface for interacting with the configuration of external connectors for the plugin entities.

**Returns:** [*ConfigureSubClient*](../interfaces/configure_client.configuresubclient.md)

Defined in: [client.ts:76](https://github.com/elastic/kibana/blob/a80791aa4cc/x-pack/plugins/cases/server/client/client.ts#L76)

___

### stats

• get **stats**(): [*StatsSubClient*](../interfaces/stats_client.statssubclient.md)

Retrieves an interface for retrieving statistics related to the cases entities.

**Returns:** [*StatsSubClient*](../interfaces/stats_client.statssubclient.md)

Defined in: [client.ts:83](https://github.com/elastic/kibana/blob/a80791aa4cc/x-pack/plugins/cases/server/client/client.ts#L83)

___

### subCases

• get **subCases**(): [*SubCasesClient*](../interfaces/sub_cases_client.subcasesclient.md)

Retrieves an interface for interacting with the case as a connector entities.

Currently this functionality is disabled and will throw an error if this function is called.

**Returns:** [*SubCasesClient*](../interfaces/sub_cases_client.subcasesclient.md)

Defined in: [client.ts:66](https://github.com/elastic/kibana/blob/a80791aa4cc/x-pack/plugins/cases/server/client/client.ts#L66)

___

### userActions

• get **userActions**(): [*UserActionsSubClient*](../interfaces/user_actions_client.useractionssubclient.md)

Retrieves an interface for interacting with the user actions associated with the plugin entities.

**Returns:** [*UserActionsSubClient*](../interfaces/user_actions_client.useractionssubclient.md)

Defined in: [client.ts:57](https://github.com/elastic/kibana/blob/a80791aa4cc/x-pack/plugins/cases/server/client/client.ts#L57)
