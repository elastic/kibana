[Cases Client API Interface](../cases_client_api.md) / [configure/client](../modules/configure_client.md) / ConfigureSubClient

# Interface: ConfigureSubClient

[configure/client](../modules/configure_client.md).ConfigureSubClient

This is the public API for interacting with the connector configuration for cases.

## Table of contents

### Methods

- [create](configure_client.configuresubclient.md#create)
- [get](configure_client.configuresubclient.md#get)
- [getConnectors](configure_client.configuresubclient.md#getconnectors)
- [update](configure_client.configuresubclient.md#update)

## Methods

### create

▸ **create**(`configuration`: [*ICasesConfigureRequest*](typedoc_interfaces.icasesconfigurerequest.md)): *Promise*<[*ICasesConfigureResponse*](typedoc_interfaces.icasesconfigureresponse.md)\>

Creates a configuration if one does not already exist. If one exists it is deleted and a new one is created.

#### Parameters

| Name | Type |
| :------ | :------ |
| `configuration` | [*ICasesConfigureRequest*](typedoc_interfaces.icasesconfigurerequest.md) |

**Returns:** *Promise*<[*ICasesConfigureResponse*](typedoc_interfaces.icasesconfigureresponse.md)\>

Defined in: [configure/client.ts:98](https://github.com/elastic/kibana/blob/a80791aa4cc/x-pack/plugins/cases/server/client/configure/client.ts#L98)

___

### get

▸ **get**(`params`: { `owner`: *undefined* \| *string* \| *string*[]  }): *Promise*<{} \| [*ICasesConfigureResponse*](typedoc_interfaces.icasesconfigureresponse.md)\>

Retrieves the external connector configuration for a particular case owner.

#### Parameters

| Name | Type |
| :------ | :------ |
| `params` | *object* |
| `params.owner` | *undefined* \| *string* \| *string*[] |

**Returns:** *Promise*<{} \| [*ICasesConfigureResponse*](typedoc_interfaces.icasesconfigureresponse.md)\>

Defined in: [configure/client.ts:80](https://github.com/elastic/kibana/blob/a80791aa4cc/x-pack/plugins/cases/server/client/configure/client.ts#L80)

___

### getConnectors

▸ **getConnectors**(): *Promise*<FindActionResult[]\>

Retrieves the valid external connectors supported by the cases plugin.

**Returns:** *Promise*<FindActionResult[]\>

Defined in: [configure/client.ts:84](https://github.com/elastic/kibana/blob/a80791aa4cc/x-pack/plugins/cases/server/client/configure/client.ts#L84)

___

### update

▸ **update**(`configurationId`: *string*, `configurations`: [*ICasesConfigurePatch*](typedoc_interfaces.icasesconfigurepatch.md)): *Promise*<[*ICasesConfigureResponse*](typedoc_interfaces.icasesconfigureresponse.md)\>

Updates a particular configuration with new values.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `configurationId` | *string* | the ID of the configuration to update |
| `configurations` | [*ICasesConfigurePatch*](typedoc_interfaces.icasesconfigurepatch.md) | the new configuration parameters |

**Returns:** *Promise*<[*ICasesConfigureResponse*](typedoc_interfaces.icasesconfigureresponse.md)\>

Defined in: [configure/client.ts:91](https://github.com/elastic/kibana/blob/a80791aa4cc/x-pack/plugins/cases/server/client/configure/client.ts#L91)
