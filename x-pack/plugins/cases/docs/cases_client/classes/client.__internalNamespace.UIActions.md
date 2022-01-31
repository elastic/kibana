[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_\_internalNamespace](../modules/client.__internalNamespace.md) / UIActions

# Class: UIActions

[client](../modules/client.md).[__internalNamespace](../modules/client.__internalNamespace.md).UIActions

## Table of contents

### Constructors

- [constructor](client.__internalNamespace.UIActions.md#constructor)

### Properties

- [prefix](client.__internalNamespace.UIActions.md#prefix)

### Methods

- [get](client.__internalNamespace.UIActions.md#get)

## Constructors

### constructor

• **new UIActions**(`versionNumber`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `versionNumber` | `string` |

#### Defined in

x-pack/plugins/security/target/types/server/authorization/actions/ui.d.ts:4

## Properties

### prefix

• `Private` `Readonly` **prefix**: `any`

#### Defined in

x-pack/plugins/security/target/types/server/authorization/actions/ui.d.ts:3

## Methods

### get

▸ **get**(`featureId`, ...`uiCapabilityParts`): `string`

#### Parameters

| Name | Type |
| :------ | :------ |
| `featureId` | keyof [`Capabilities`](../interfaces/client.__internalNamespace.Capabilities.md) |
| `...uiCapabilityParts` | `string`[] |

#### Returns

`string`

#### Defined in

x-pack/plugins/security/target/types/server/authorization/actions/ui.d.ts:5
