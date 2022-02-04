[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_internal\_namespace](../modules/client._internal_namespace.md) / AuthenticatedUser

# Interface: AuthenticatedUser

[client](../modules/client.md).[_internal_namespace](../modules/client._internal_namespace.md).AuthenticatedUser

Represents the currently authenticated user.

## Hierarchy

- [`User`](client._internal_namespace.User.md)

  ↳ **`AuthenticatedUser`**

## Table of contents

### Properties

- [authentication\_provider](client._internal_namespace.AuthenticatedUser.md#authentication_provider)
- [authentication\_realm](client._internal_namespace.AuthenticatedUser.md#authentication_realm)
- [authentication\_type](client._internal_namespace.AuthenticatedUser.md#authentication_type)
- [email](client._internal_namespace.AuthenticatedUser.md#email)
- [enabled](client._internal_namespace.AuthenticatedUser.md#enabled)
- [full\_name](client._internal_namespace.AuthenticatedUser.md#full_name)
- [lookup\_realm](client._internal_namespace.AuthenticatedUser.md#lookup_realm)
- [metadata](client._internal_namespace.AuthenticatedUser.md#metadata)
- [roles](client._internal_namespace.AuthenticatedUser.md#roles)
- [username](client._internal_namespace.AuthenticatedUser.md#username)

## Properties

### authentication\_provider

• **authentication\_provider**: [`AuthenticationProvider`](client._internal_namespace.AuthenticationProvider.md)

The authentication provider that used to authenticate user.

#### Defined in

x-pack/plugins/security/target/types/common/model/authenticated_user.d.ts:22

___

### authentication\_realm

• **authentication\_realm**: [`UserRealm`](client._internal_namespace.UserRealm.md)

The name and type of the Realm that has authenticated the user.

#### Defined in

x-pack/plugins/security/target/types/common/model/authenticated_user.d.ts:14

___

### authentication\_type

• **authentication\_type**: `string`

The AuthenticationType used by ES to authenticate the user.

**`example`** "realm" | "api_key" | "token" | "anonymous" | "internal"

#### Defined in

x-pack/plugins/security/target/types/common/model/authenticated_user.d.ts:28

___

### email

• `Optional` **email**: `string`

#### Inherited from

[User](client._internal_namespace.User.md).[email](client._internal_namespace.User.md#email)

#### Defined in

x-pack/plugins/security/target/types/common/model/user.d.ts:3

___

### enabled

• **enabled**: `boolean`

#### Inherited from

[User](client._internal_namespace.User.md).[enabled](client._internal_namespace.User.md#enabled)

#### Defined in

x-pack/plugins/security/target/types/common/model/user.d.ts:6

___

### full\_name

• `Optional` **full\_name**: `string`

#### Inherited from

[User](client._internal_namespace.User.md).[full_name](client._internal_namespace.User.md#full_name)

#### Defined in

x-pack/plugins/security/target/types/common/model/user.d.ts:4

___

### lookup\_realm

• **lookup\_realm**: [`UserRealm`](client._internal_namespace.UserRealm.md)

The name and type of the Realm where the user information were retrieved from.

#### Defined in

x-pack/plugins/security/target/types/common/model/authenticated_user.d.ts:18

___

### metadata

• `Optional` **metadata**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `_deprecated?` | `boolean` |
| `_deprecated_reason?` | `string` |
| `_reserved` | `boolean` |

#### Inherited from

[User](client._internal_namespace.User.md).[metadata](client._internal_namespace.User.md#metadata)

#### Defined in

x-pack/plugins/security/target/types/common/model/user.d.ts:7

___

### roles

• **roles**: readonly `string`[]

#### Inherited from

[User](client._internal_namespace.User.md).[roles](client._internal_namespace.User.md#roles)

#### Defined in

x-pack/plugins/security/target/types/common/model/user.d.ts:5

___

### username

• **username**: `string`

#### Inherited from

[User](client._internal_namespace.User.md).[username](client._internal_namespace.User.md#username)

#### Defined in

x-pack/plugins/security/target/types/common/model/user.d.ts:2
