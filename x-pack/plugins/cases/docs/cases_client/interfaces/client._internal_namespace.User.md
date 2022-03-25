[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_internal\_namespace](../modules/client._internal_namespace.md) / User

# Interface: User

[client](../modules/client.md).[_internal_namespace](../modules/client._internal_namespace.md).User

## Hierarchy

- **`User`**

  ↳ [`AuthenticatedUser`](client._internal_namespace.AuthenticatedUser.md)

## Table of contents

### Properties

- [email](client._internal_namespace.User.md#email)
- [enabled](client._internal_namespace.User.md#enabled)
- [full\_name](client._internal_namespace.User.md#full_name)
- [metadata](client._internal_namespace.User.md#metadata)
- [roles](client._internal_namespace.User.md#roles)
- [username](client._internal_namespace.User.md#username)

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
