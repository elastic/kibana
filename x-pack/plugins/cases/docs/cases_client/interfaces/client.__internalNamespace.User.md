[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_\_internalNamespace](../modules/client.__internalNamespace.md) / User

# Interface: User

[client](../modules/client.md).[__internalNamespace](../modules/client.__internalNamespace.md).User

## Hierarchy

- **`User`**

  ↳ [`AuthenticatedUser`](client.__internalNamespace.AuthenticatedUser.md)

## Table of contents

### Properties

- [email](client.__internalNamespace.User.md#email)
- [enabled](client.__internalNamespace.User.md#enabled)
- [full\_name](client.__internalNamespace.User.md#full_name)
- [metadata](client.__internalNamespace.User.md#metadata)
- [roles](client.__internalNamespace.User.md#roles)
- [username](client.__internalNamespace.User.md#username)

## Properties

### email

• `Optional` **email**: `string`

#### Defined in

x-pack/plugins/security/target/types/common/model/user.d.ts:3

___

### enabled

• **enabled**: `boolean`

#### Defined in

x-pack/plugins/security/target/types/common/model/user.d.ts:6

___

### full\_name

• `Optional` **full\_name**: `string`

#### Defined in

x-pack/plugins/security/target/types/common/model/user.d.ts:4

___

### metadata

• `Optional` **metadata**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `_deprecated?` | `boolean` |
| `_deprecated_reason?` | `string` |
| `_reserved` | `boolean` |

#### Defined in

x-pack/plugins/security/target/types/common/model/user.d.ts:7

___

### roles

• **roles**: readonly `string`[]

#### Defined in

x-pack/plugins/security/target/types/common/model/user.d.ts:5

___

### username

• **username**: `string`

#### Defined in

x-pack/plugins/security/target/types/common/model/user.d.ts:2
