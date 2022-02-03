[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_internal\_namespace](../modules/client._internal_namespace.md) / UIActions

# Class: UIActions

[client](../modules/client.md).[_internal_namespace](../modules/client._internal_namespace.md).UIActions

## Table of contents

### Constructors

- [constructor](client._internal_namespace.UIActions.md#constructor)

### Properties

- [prefix](client._internal_namespace.UIActions.md#prefix)

### Methods

- [get](client._internal_namespace.UIActions.md#get)

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
| `featureId` | keyof [`Capabilities`](../interfaces/client._internal_namespace.Capabilities.md) |
| `...uiCapabilityParts` | `string`[] |

#### Returns

`string`

#### Defined in

x-pack/plugins/security/target/types/server/authorization/actions/ui.d.ts:5
