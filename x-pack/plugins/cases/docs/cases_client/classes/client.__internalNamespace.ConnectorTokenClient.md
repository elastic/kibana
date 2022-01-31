[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_\_internalNamespace](../modules/client.__internalNamespace.md) / ConnectorTokenClient

# Class: ConnectorTokenClient

[client](../modules/client.md).[__internalNamespace](../modules/client.__internalNamespace.md).ConnectorTokenClient

## Table of contents

### Constructors

- [constructor](client.__internalNamespace.ConnectorTokenClient.md#constructor)

### Properties

- [encryptedSavedObjectsClient](client.__internalNamespace.ConnectorTokenClient.md#encryptedsavedobjectsclient)
- [logger](client.__internalNamespace.ConnectorTokenClient.md#logger)
- [unsecuredSavedObjectsClient](client.__internalNamespace.ConnectorTokenClient.md#unsecuredsavedobjectsclient)

### Methods

- [create](client.__internalNamespace.ConnectorTokenClient.md#create)
- [deleteConnectorTokens](client.__internalNamespace.ConnectorTokenClient.md#deleteconnectortokens)
- [get](client.__internalNamespace.ConnectorTokenClient.md#get)
- [update](client.__internalNamespace.ConnectorTokenClient.md#update)

## Constructors

### constructor

• **new ConnectorTokenClient**(`__namedParameters`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [`ConstructorOptions`](../interfaces/client.__internalNamespace.ConstructorOptions-2.md) |

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

▸ **create**(`__namedParameters`): `Promise`<[`ConnectorToken`](../interfaces/client.__internalNamespace.ConnectorToken.md)\>

Create new token for connector

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [`CreateOptions`](../interfaces/client.__internalNamespace.CreateOptions-1.md) |

#### Returns

`Promise`<[`ConnectorToken`](../interfaces/client.__internalNamespace.ConnectorToken.md)\>

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

▸ **get**(`__namedParameters`): `Promise`<{ `connectorToken`: ``null`` \| [`ConnectorToken`](../interfaces/client.__internalNamespace.ConnectorToken.md) ; `hasErrors`: `boolean`  }\>

Get connector token

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | `Object` |
| `__namedParameters.connectorId` | `string` |
| `__namedParameters.tokenType?` | `string` |

#### Returns

`Promise`<{ `connectorToken`: ``null`` \| [`ConnectorToken`](../interfaces/client.__internalNamespace.ConnectorToken.md) ; `hasErrors`: `boolean`  }\>

#### Defined in

x-pack/plugins/actions/target/types/server/builtin_action_types/lib/connector_token_client.d.ts:38

___

### update

▸ **update**(`__namedParameters`): `Promise`<``null`` \| [`ConnectorToken`](../interfaces/client.__internalNamespace.ConnectorToken.md)\>

Update connector token

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [`UpdateOptions`](../interfaces/client.__internalNamespace.UpdateOptions-1.md) |

#### Returns

`Promise`<``null`` \| [`ConnectorToken`](../interfaces/client.__internalNamespace.ConnectorToken.md)\>

#### Defined in

x-pack/plugins/actions/target/types/server/builtin_action_types/lib/connector_token_client.d.ts:34
