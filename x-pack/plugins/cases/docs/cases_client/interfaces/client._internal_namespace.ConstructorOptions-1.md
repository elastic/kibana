[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_internal\_namespace](../modules/client._internal_namespace.md) / ConstructorOptions

# Interface: ConstructorOptions

[client](../modules/client.md).[_internal_namespace](../modules/client._internal_namespace.md).ConstructorOptions

## Table of contents

### Properties

- [authentication](client._internal_namespace.ConstructorOptions-1.md#authentication)
- [authorization](client._internal_namespace.ConstructorOptions-1.md#authorization)
- [authorizationMode](client._internal_namespace.ConstructorOptions-1.md#authorizationmode)
- [request](client._internal_namespace.ConstructorOptions-1.md#request)

## Properties

### authentication

• `Optional` **authentication**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `getCurrentUser` | (`request`: [`KibanaRequest`](../classes/client._internal_namespace.KibanaRequest.md)<`unknown`, `unknown`, `unknown`, `any`\>) => ``null`` \| [`AuthenticatedUser`](client._internal_namespace.AuthenticatedUser.md) |

#### Defined in

x-pack/plugins/actions/target/types/server/authorization/actions_authorization.d.ts:7

___

### authorization

• `Optional` **authorization**: [`AuthorizationServiceSetup`](client._internal_namespace.AuthorizationServiceSetup.md)

#### Defined in

x-pack/plugins/actions/target/types/server/authorization/actions_authorization.d.ts:6

___

### authorizationMode

• `Optional` **authorizationMode**: [`AuthorizationMode`](../enums/client._internal_namespace.AuthorizationMode.md)

#### Defined in

x-pack/plugins/actions/target/types/server/authorization/actions_authorization.d.ts:8

___

### request

• **request**: [`KibanaRequest`](../classes/client._internal_namespace.KibanaRequest.md)<`unknown`, `unknown`, `unknown`, `any`\>

#### Defined in

x-pack/plugins/actions/target/types/server/authorization/actions_authorization.d.ts:5
