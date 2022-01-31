[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_\_internalNamespace](../modules/client.__internalNamespace.md) / ActionsAuthorization

# Class: ActionsAuthorization

[client](../modules/client.md).[__internalNamespace](../modules/client.__internalNamespace.md).ActionsAuthorization

## Table of contents

### Constructors

- [constructor](client.__internalNamespace.ActionsAuthorization.md#constructor)

### Properties

- [authorization](client.__internalNamespace.ActionsAuthorization.md#authorization)
- [authorizationMode](client.__internalNamespace.ActionsAuthorization.md#authorizationmode)
- [isOperationExemptDueToLegacyRbac](client.__internalNamespace.ActionsAuthorization.md#isoperationexemptduetolegacyrbac)
- [request](client.__internalNamespace.ActionsAuthorization.md#request)

### Methods

- [ensureAuthorized](client.__internalNamespace.ActionsAuthorization.md#ensureauthorized)

## Constructors

### constructor

• **new ActionsAuthorization**(`__namedParameters`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [`ConstructorOptions`](../interfaces/client.__internalNamespace.ConstructorOptions-1.md) |

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
