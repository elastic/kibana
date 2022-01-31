[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_\_internalNamespace](../modules/client.__internalNamespace.md) / CheckPrivileges

# Interface: CheckPrivileges

[client](../modules/client.md).[__internalNamespace](../modules/client.__internalNamespace.md).CheckPrivileges

## Table of contents

### Methods

- [atSpace](client.__internalNamespace.CheckPrivileges.md#atspace)
- [atSpaces](client.__internalNamespace.CheckPrivileges.md#atspaces)
- [globally](client.__internalNamespace.CheckPrivileges.md#globally)

## Methods

### atSpace

▸ **atSpace**(`spaceId`, `privileges`, `options?`): `Promise`<[`CheckPrivilegesResponse`](client.__internalNamespace.CheckPrivilegesResponse.md)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `spaceId` | `string` |
| `privileges` | [`CheckPrivilegesPayload`](client.__internalNamespace.CheckPrivilegesPayload.md) |
| `options?` | [`CheckPrivilegesOptions`](client.__internalNamespace.CheckPrivilegesOptions.md) |

#### Returns

`Promise`<[`CheckPrivilegesResponse`](client.__internalNamespace.CheckPrivilegesResponse.md)\>

#### Defined in

x-pack/plugins/security/target/types/server/authorization/types.d.ts:61

___

### atSpaces

▸ **atSpaces**(`spaceIds`, `privileges`, `options?`): `Promise`<[`CheckPrivilegesResponse`](client.__internalNamespace.CheckPrivilegesResponse.md)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `spaceIds` | `string`[] |
| `privileges` | [`CheckPrivilegesPayload`](client.__internalNamespace.CheckPrivilegesPayload.md) |
| `options?` | [`CheckPrivilegesOptions`](client.__internalNamespace.CheckPrivilegesOptions.md) |

#### Returns

`Promise`<[`CheckPrivilegesResponse`](client.__internalNamespace.CheckPrivilegesResponse.md)\>

#### Defined in

x-pack/plugins/security/target/types/server/authorization/types.d.ts:62

___

### globally

▸ **globally**(`privileges`, `options?`): `Promise`<[`CheckPrivilegesResponse`](client.__internalNamespace.CheckPrivilegesResponse.md)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `privileges` | [`CheckPrivilegesPayload`](client.__internalNamespace.CheckPrivilegesPayload.md) |
| `options?` | [`CheckPrivilegesOptions`](client.__internalNamespace.CheckPrivilegesOptions.md) |

#### Returns

`Promise`<[`CheckPrivilegesResponse`](client.__internalNamespace.CheckPrivilegesResponse.md)\>

#### Defined in

x-pack/plugins/security/target/types/server/authorization/types.d.ts:63
