[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_\_internalNamespace](../modules/client.__internalNamespace.md) / ConstructorOptions

# Interface: ConstructorOptions

[client](../modules/client.md).[__internalNamespace](../modules/client.__internalNamespace.md).ConstructorOptions

## Table of contents

### Properties

- [authentication](client.__internalNamespace.ConstructorOptions-1.md#authentication)
- [authorization](client.__internalNamespace.ConstructorOptions-1.md#authorization)
- [authorizationMode](client.__internalNamespace.ConstructorOptions-1.md#authorizationmode)
- [request](client.__internalNamespace.ConstructorOptions-1.md#request)

## Properties

### authentication

• `Optional` **authentication**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `getCurrentUser` | (`request`: [`KibanaRequest`](../classes/client.__internalNamespace.KibanaRequest.md)<`unknown`, `unknown`, `unknown`, `any`\>) => ``null`` \| [`AuthenticatedUser`](client.__internalNamespace.AuthenticatedUser.md) |

#### Defined in

x-pack/plugins/actions/target/types/server/authorization/actions_authorization.d.ts:7

___

### authorization

• `Optional` **authorization**: [`AuthorizationServiceSetup`](client.__internalNamespace.AuthorizationServiceSetup.md)

#### Defined in

x-pack/plugins/actions/target/types/server/authorization/actions_authorization.d.ts:6

___

### authorizationMode

• `Optional` **authorizationMode**: [`AuthorizationMode`](../enums/client.__internalNamespace.AuthorizationMode.md)

#### Defined in

x-pack/plugins/actions/target/types/server/authorization/actions_authorization.d.ts:8

___

### request

• **request**: [`KibanaRequest`](../classes/client.__internalNamespace.KibanaRequest.md)<`unknown`, `unknown`, `unknown`, `any`\>

#### Defined in

x-pack/plugins/actions/target/types/server/authorization/actions_authorization.d.ts:5
