[Cases Client API Interface](../README.md) / [configure/client](../modules/configure_client.md) / ConfigureSubClient

# Interface: ConfigureSubClient

[configure/client](../modules/configure_client.md).ConfigureSubClient

This is the public API for interacting with the connector configuration for cases.

## Table of contents

### Methods

- [create](configure_client.ConfigureSubClient.md#create)
- [get](configure_client.ConfigureSubClient.md#get)
- [getConnectors](configure_client.ConfigureSubClient.md#getconnectors)
- [update](configure_client.ConfigureSubClient.md#update)

## Methods

### create

▸ **create**(`configuration`): `Promise`<[`ICasesConfigureResponse`](typedoc_interfaces.ICasesConfigureResponse.md)\>

Creates a configuration if one does not already exist. If one exists it is deleted and a new one is created.

#### Parameters

| Name | Type |
| :------ | :------ |
| `configuration` | [`ICasesConfigureRequest`](typedoc_interfaces.ICasesConfigureRequest.md) |

#### Returns

`Promise`<[`ICasesConfigureResponse`](typedoc_interfaces.ICasesConfigureResponse.md)\>

#### Defined in

[x-pack/plugins/cases/server/client/configure/client.ts:93](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/client/configure/client.ts#L93)

___

### get

▸ **get**(`params`): `Promise`<{} \| [`ICasesConfigureResponse`](typedoc_interfaces.ICasesConfigureResponse.md)\>

Retrieves the external connector configuration for a particular case owner.

#### Parameters

| Name | Type |
| :------ | :------ |
| `params` | `Object` |
| `params.owner` | `undefined` \| `string` \| `string`[] |

#### Returns

`Promise`<{} \| [`ICasesConfigureResponse`](typedoc_interfaces.ICasesConfigureResponse.md)\>

#### Defined in

[x-pack/plugins/cases/server/client/configure/client.ts:75](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/client/configure/client.ts#L75)

___

### getConnectors

▸ **getConnectors**(): `Promise`<[`FindActionResult`](client._internal_namespace.FindActionResult.md)[]\>

Retrieves the valid external connectors supported by the cases plugin.

#### Returns

`Promise`<[`FindActionResult`](client._internal_namespace.FindActionResult.md)[]\>

#### Defined in

[x-pack/plugins/cases/server/client/configure/client.ts:79](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/client/configure/client.ts#L79)

___

### update

▸ **update**(`configurationId`, `configurations`): `Promise`<[`ICasesConfigureResponse`](typedoc_interfaces.ICasesConfigureResponse.md)\>

Updates a particular configuration with new values.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `configurationId` | `string` | the ID of the configuration to update |
| `configurations` | [`ICasesConfigurePatch`](typedoc_interfaces.ICasesConfigurePatch.md) | the new configuration parameters |

#### Returns

`Promise`<[`ICasesConfigureResponse`](typedoc_interfaces.ICasesConfigureResponse.md)\>

#### Defined in

[x-pack/plugins/cases/server/client/configure/client.ts:86](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/client/configure/client.ts#L86)
