[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_internal\_namespace](../modules/client._internal_namespace.md) / CheckPrivilegesPayload

# Interface: CheckPrivilegesPayload

[client](../modules/client.md).[_internal_namespace](../modules/client._internal_namespace.md).CheckPrivilegesPayload

## Table of contents

### Properties

- [elasticsearch](client._internal_namespace.CheckPrivilegesPayload.md#elasticsearch)
- [kibana](client._internal_namespace.CheckPrivilegesPayload.md#kibana)

## Properties

### elasticsearch

• `Optional` **elasticsearch**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `cluster` | `string`[] |
| `index` | `Record`<`string`, `string`[]\> |

#### Defined in

x-pack/plugins/security/target/types/server/authorization/types.d.ts:67

___

### kibana

• `Optional` **kibana**: `string` \| `string`[]

#### Defined in

x-pack/plugins/security/target/types/server/authorization/types.d.ts:66
