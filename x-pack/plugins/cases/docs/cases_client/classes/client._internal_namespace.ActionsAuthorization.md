[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_internal\_namespace](../modules/client._internal_namespace.md) / ActionsAuthorization

# Class: ActionsAuthorization

[client](../modules/client.md).[_internal_namespace](../modules/client._internal_namespace.md).ActionsAuthorization

## Table of contents

### Constructors

- [constructor](client._internal_namespace.ActionsAuthorization.md#constructor)

### Properties

- [authorization](client._internal_namespace.ActionsAuthorization.md#authorization)
- [authorizationMode](client._internal_namespace.ActionsAuthorization.md#authorizationmode)
- [isOperationExemptDueToLegacyRbac](client._internal_namespace.ActionsAuthorization.md#isoperationexemptduetolegacyrbac)
- [request](client._internal_namespace.ActionsAuthorization.md#request)

### Methods

- [ensureAuthorized](client._internal_namespace.ActionsAuthorization.md#ensureauthorized)

## Constructors

### constructor

• **new ActionsAuthorization**(`__namedParameters`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [`ConstructorOptions`](../interfaces/client._internal_namespace.ConstructorOptions-1.md) |

#### Defined in

x-pack/plugins/actions/target/types/server/authorization/actions_authorization.d.ts:14

## Properties

### authorization

• `Private` `Optional` `Readonly` **authorization**: `any`

#### Defined in

x-pack/plugins/actions/target/types/server/authorization/actions_authorization.d.ts:12

___

### authorizationMode

• `Private` `Readonly` **authorizationMode**: `any`

#### Defined in

x-pack/plugins/actions/target/types/server/authorization/actions_authorization.d.ts:13

___

### isOperationExemptDueToLegacyRbac

• `Private` **isOperationExemptDueToLegacyRbac**: `any`

#### Defined in

x-pack/plugins/actions/target/types/server/authorization/actions_authorization.d.ts:16

___

### request

• `Private` `Readonly` **request**: `any`

#### Defined in

x-pack/plugins/actions/target/types/server/authorization/actions_authorization.d.ts:11

## Methods

### ensureAuthorized

▸ **ensureAuthorized**(`operation`, `actionTypeId?`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `operation` | `string` |
| `actionTypeId?` | `string` |

#### Returns

`Promise`<`void`\>

#### Defined in

x-pack/plugins/actions/target/types/server/authorization/actions_authorization.d.ts:15
