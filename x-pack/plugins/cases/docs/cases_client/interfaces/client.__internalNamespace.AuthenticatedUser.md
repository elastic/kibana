[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_\_internalNamespace](../modules/client.__internalNamespace.md) / AuthenticatedUser

# Interface: AuthenticatedUser

[client](../modules/client.md).[__internalNamespace](../modules/client.__internalNamespace.md).AuthenticatedUser

Represents the currently authenticated user.

## Hierarchy

- [`User`](client.__internalNamespace.User.md)

  ↳ **`AuthenticatedUser`**

## Table of contents

### Properties

- [authentication\_provider](client.__internalNamespace.AuthenticatedUser.md#authentication_provider)
- [authentication\_realm](client.__internalNamespace.AuthenticatedUser.md#authentication_realm)
- [authentication\_type](client.__internalNamespace.AuthenticatedUser.md#authentication_type)
- [email](client.__internalNamespace.AuthenticatedUser.md#email)
- [enabled](client.__internalNamespace.AuthenticatedUser.md#enabled)
- [full\_name](client.__internalNamespace.AuthenticatedUser.md#full_name)
- [lookup\_realm](client.__internalNamespace.AuthenticatedUser.md#lookup_realm)
- [metadata](client.__internalNamespace.AuthenticatedUser.md#metadata)
- [roles](client.__internalNamespace.AuthenticatedUser.md#roles)
- [username](client.__internalNamespace.AuthenticatedUser.md#username)

## Properties

### authentication\_provider

• **authentication\_provider**: [`AuthenticationProvider`](client.__internalNamespace.AuthenticationProvider.md)

The authentication provider that used to authenticate user.

#### Defined in

x-pack/plugins/security/target/types/common/model/authenticated_user.d.ts:22

___

### authentication\_realm

• **authentication\_realm**: [`UserRealm`](client.__internalNamespace.UserRealm.md)

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

[User](client.__internalNamespace.User.md).[email](client.__internalNamespace.User.md#email)

#### Defined in

x-pack/plugins/security/target/types/common/model/user.d.ts:3

___

### enabled

• **enabled**: `boolean`

#### Inherited from

[User](client.__internalNamespace.User.md).[enabled](client.__internalNamespace.User.md#enabled)

#### Defined in

x-pack/plugins/security/target/types/common/model/user.d.ts:6

___

### full\_name

• `Optional` **full\_name**: `string`

#### Inherited from

[User](client.__internalNamespace.User.md).[full_name](client.__internalNamespace.User.md#full_name)

#### Defined in

x-pack/plugins/security/target/types/common/model/user.d.ts:4

___

### lookup\_realm

• **lookup\_realm**: [`UserRealm`](client.__internalNamespace.UserRealm.md)

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

[User](client.__internalNamespace.User.md).[metadata](client.__internalNamespace.User.md#metadata)

#### Defined in

x-pack/plugins/security/target/types/common/model/user.d.ts:7

___

### roles

• **roles**: readonly `string`[]

#### Inherited from

[User](client.__internalNamespace.User.md).[roles](client.__internalNamespace.User.md#roles)

#### Defined in

x-pack/plugins/security/target/types/common/model/user.d.ts:5

___

### username

• **username**: `string`

#### Inherited from

[User](client.__internalNamespace.User.md).[username](client.__internalNamespace.User.md#username)

#### Defined in

x-pack/plugins/security/target/types/common/model/user.d.ts:2
