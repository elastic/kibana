[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_internal\_namespace](../modules/client._internal_namespace.md) / ConnectorTokenClient

# Class: ConnectorTokenClient

[client](../modules/client.md).[_internal_namespace](../modules/client._internal_namespace.md).ConnectorTokenClient

## Table of contents

### Constructors

- [constructor](client._internal_namespace.ConnectorTokenClient.md#constructor)

### Properties

- [encryptedSavedObjectsClient](client._internal_namespace.ConnectorTokenClient.md#encryptedsavedobjectsclient)
- [logger](client._internal_namespace.ConnectorTokenClient.md#logger)
- [unsecuredSavedObjectsClient](client._internal_namespace.ConnectorTokenClient.md#unsecuredsavedobjectsclient)

### Methods

- [create](client._internal_namespace.ConnectorTokenClient.md#create)
- [deleteConnectorTokens](client._internal_namespace.ConnectorTokenClient.md#deleteconnectortokens)
- [get](client._internal_namespace.ConnectorTokenClient.md#get)
- [update](client._internal_namespace.ConnectorTokenClient.md#update)

## Constructors

### constructor

• **new ConnectorTokenClient**(`__namedParameters`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [`ConstructorOptions`](../interfaces/client._internal_namespace.ConstructorOptions-2.md) |

#### Defined in

x-pack/plugins/actions/target/types/server/builtin_action_types/lib/connector_token_client.d.ts:26

## Properties

### encryptedSavedObjectsClient

• `Private` `Readonly` **encryptedSavedObjectsClient**: `any`

#### Defined in

x-pack/plugins/actions/target/types/server/builtin_action_types/lib/connector_token_client.d.ts:25

___

### logger

• `Private` `Readonly` **logger**: `any`

#### Defined in

x-pack/plugins/actions/target/types/server/builtin_action_types/lib/connector_token_client.d.ts:23

___

### unsecuredSavedObjectsClient

• `Private` `Readonly` **unsecuredSavedObjectsClient**: `any`

#### Defined in

x-pack/plugins/actions/target/types/server/builtin_action_types/lib/connector_token_client.d.ts:24

## Methods

### create

▸ **create**(`__namedParameters`): `Promise`<[`ConnectorToken`](../interfaces/client._internal_namespace.ConnectorToken.md)\>

Create new token for connector

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [`CreateOptions`](../interfaces/client._internal_namespace.CreateOptions-1.md) |

#### Returns

`Promise`<[`ConnectorToken`](../interfaces/client._internal_namespace.ConnectorToken.md)\>

#### Defined in

x-pack/plugins/actions/target/types/server/builtin_action_types/lib/connector_token_client.d.ts:30

___

### deleteConnectorTokens

▸ **deleteConnectorTokens**(`__namedParameters`): `Promise`<{}[]\>

Delete all connector tokens

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | `Object` |
| `__namedParameters.connectorId` | `string` |
| `__namedParameters.tokenType?` | `string` |

#### Returns

`Promise`<{}[]\>

#### Defined in

x-pack/plugins/actions/target/types/server/builtin_action_types/lib/connector_token_client.d.ts:48

___

### get

▸ **get**(`__namedParameters`): `Promise`<{ `connectorToken`: ``null`` \| [`ConnectorToken`](../interfaces/client._internal_namespace.ConnectorToken.md) ; `hasErrors`: `boolean`  }\>

Get connector token

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | `Object` |
| `__namedParameters.connectorId` | `string` |
| `__namedParameters.tokenType?` | `string` |

#### Returns

`Promise`<{ `connectorToken`: ``null`` \| [`ConnectorToken`](../interfaces/client._internal_namespace.ConnectorToken.md) ; `hasErrors`: `boolean`  }\>

#### Defined in

x-pack/plugins/actions/target/types/server/builtin_action_types/lib/connector_token_client.d.ts:38

___

### update

▸ **update**(`__namedParameters`): `Promise`<``null`` \| [`ConnectorToken`](../interfaces/client._internal_namespace.ConnectorToken.md)\>

Update connector token

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [`UpdateOptions`](../interfaces/client._internal_namespace.UpdateOptions-1.md) |

#### Returns

`Promise`<``null`` \| [`ConnectorToken`](../interfaces/client._internal_namespace.ConnectorToken.md)\>

#### Defined in

x-pack/plugins/actions/target/types/server/builtin_action_types/lib/connector_token_client.d.ts:34
