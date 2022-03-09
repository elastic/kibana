[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_internal\_namespace](../modules/client._internal_namespace.md) / CheckPrivilegesOptions

# Interface: CheckPrivilegesOptions

[client](../modules/client.md).[_internal_namespace](../modules/client._internal_namespace.md).CheckPrivilegesOptions

Options to influce the privilege checks.

## Table of contents

### Properties

- [requireLoginAction](client._internal_namespace.CheckPrivilegesOptions.md#requireloginaction)

## Properties

### requireLoginAction

• `Optional` **requireLoginAction**: `boolean`

Whether or not the `login` action should be required (default: true).
Setting this to false is not advised except for special circumstances, when you do not require
the request to belong to a user capable of logging into Kibana.

#### Defined in

x-pack/plugins/security/target/types/server/authorization/types.d.ts:31
