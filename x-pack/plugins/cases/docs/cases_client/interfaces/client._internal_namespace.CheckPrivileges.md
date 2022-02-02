[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_internal\_namespace](../modules/client._internal_namespace.md) / CheckPrivileges

# Interface: CheckPrivileges

[client](../modules/client.md).[_internal_namespace](../modules/client._internal_namespace.md).CheckPrivileges

## Table of contents

### Methods

- [atSpace](client._internal_namespace.CheckPrivileges.md#atspace)
- [atSpaces](client._internal_namespace.CheckPrivileges.md#atspaces)
- [globally](client._internal_namespace.CheckPrivileges.md#globally)

## Methods

### atSpace

▸ **atSpace**(`spaceId`, `privileges`, `options?`): `Promise`<[`CheckPrivilegesResponse`](client._internal_namespace.CheckPrivilegesResponse.md)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `spaceId` | `string` |
| `privileges` | [`CheckPrivilegesPayload`](client._internal_namespace.CheckPrivilegesPayload.md) |
| `options?` | [`CheckPrivilegesOptions`](client._internal_namespace.CheckPrivilegesOptions.md) |

#### Returns

`Promise`<[`CheckPrivilegesResponse`](client._internal_namespace.CheckPrivilegesResponse.md)\>

#### Defined in

x-pack/plugins/security/target/types/server/authorization/types.d.ts:61

___

### atSpaces

▸ **atSpaces**(`spaceIds`, `privileges`, `options?`): `Promise`<[`CheckPrivilegesResponse`](client._internal_namespace.CheckPrivilegesResponse.md)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `spaceIds` | `string`[] |
| `privileges` | [`CheckPrivilegesPayload`](client._internal_namespace.CheckPrivilegesPayload.md) |
| `options?` | [`CheckPrivilegesOptions`](client._internal_namespace.CheckPrivilegesOptions.md) |

#### Returns

`Promise`<[`CheckPrivilegesResponse`](client._internal_namespace.CheckPrivilegesResponse.md)\>

#### Defined in

x-pack/plugins/security/target/types/server/authorization/types.d.ts:62

___

### globally

▸ **globally**(`privileges`, `options?`): `Promise`<[`CheckPrivilegesResponse`](client._internal_namespace.CheckPrivilegesResponse.md)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `privileges` | [`CheckPrivilegesPayload`](client._internal_namespace.CheckPrivilegesPayload.md) |
| `options?` | [`CheckPrivilegesOptions`](client._internal_namespace.CheckPrivilegesOptions.md) |

#### Returns

`Promise`<[`CheckPrivilegesResponse`](client._internal_namespace.CheckPrivilegesResponse.md)\>

#### Defined in

x-pack/plugins/security/target/types/server/authorization/types.d.ts:63
