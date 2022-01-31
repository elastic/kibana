[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_\_internalNamespace](../modules/client.__internalNamespace.md) / CheckPrivilegesResponse

# Interface: CheckPrivilegesResponse

[client](../modules/client.md).[__internalNamespace](../modules/client.__internalNamespace.md).CheckPrivilegesResponse

## Table of contents

### Properties

- [hasAllRequested](client.__internalNamespace.CheckPrivilegesResponse.md#hasallrequested)
- [privileges](client.__internalNamespace.CheckPrivilegesResponse.md#privileges)
- [username](client.__internalNamespace.CheckPrivilegesResponse.md#username)

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
