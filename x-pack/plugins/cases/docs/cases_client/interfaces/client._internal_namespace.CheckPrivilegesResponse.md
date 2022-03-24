[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_internal\_namespace](../modules/client._internal_namespace.md) / CheckPrivilegesResponse

# Interface: CheckPrivilegesResponse

[client](../modules/client.md).[_internal_namespace](../modules/client._internal_namespace.md).CheckPrivilegesResponse

## Table of contents

### Properties

- [hasAllRequested](client._internal_namespace.CheckPrivilegesResponse.md#hasallrequested)
- [privileges](client._internal_namespace.CheckPrivilegesResponse.md#privileges)
- [username](client._internal_namespace.CheckPrivilegesResponse.md#username)

## Properties

### hasAllRequested

• **hasAllRequested**: `boolean`

#### Defined in

x-pack/plugins/security/target/types/server/authorization/types.d.ts:34

___

### privileges

• **privileges**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `elasticsearch` | `Object` |
| `elasticsearch.cluster` | { `authorized`: `boolean` ; `privilege`: `string`  }[] |
| `elasticsearch.index` | `Object` |
| `kibana` | { `authorized`: `boolean` ; `privilege`: `string` ; `resource?`: `string`  }[] |

#### Defined in

x-pack/plugins/security/target/types/server/authorization/types.d.ts:36

___

### username

• **username**: `string`

#### Defined in

x-pack/plugins/security/target/types/server/authorization/types.d.ts:35
