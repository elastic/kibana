[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_internal\_namespace](../modules/client._internal_namespace.md) / CommonArguments

# Interface: CommonArguments

[client](../modules/client.md).[_internal_namespace](../modules/client._internal_namespace.md).CommonArguments

## Table of contents

### Properties

- [action](client._internal_namespace.CommonArguments.md#action)
- [attachmentId](client._internal_namespace.CommonArguments.md#attachmentid)
- [caseId](client._internal_namespace.CommonArguments.md#caseid)
- [connectorId](client._internal_namespace.CommonArguments.md#connectorid)
- [owner](client._internal_namespace.CommonArguments.md#owner)
- [user](client._internal_namespace.CommonArguments.md#user)

## Properties

### action

• `Optional` **action**: ``"add"`` \| ``"create"`` \| ``"delete"`` \| ``"update"`` \| ``"push_to_service"``

#### Defined in

[x-pack/plugins/cases/server/services/user_actions/types.ts:80](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/services/user_actions/types.ts#L80)

___

### attachmentId

• `Optional` **attachmentId**: `string`

#### Defined in

[x-pack/plugins/cases/server/services/user_actions/types.ts:78](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/services/user_actions/types.ts#L78)

___

### caseId

• **caseId**: `string`

#### Defined in

[x-pack/plugins/cases/server/services/user_actions/types.ts:76](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/services/user_actions/types.ts#L76)

___

### connectorId

• `Optional` **connectorId**: `string`

#### Defined in

[x-pack/plugins/cases/server/services/user_actions/types.ts:79](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/services/user_actions/types.ts#L79)

___

### owner

• **owner**: `string`

#### Defined in

[x-pack/plugins/cases/server/services/user_actions/types.ts:77](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/services/user_actions/types.ts#L77)

___

### user

• **user**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `email` | `undefined` \| ``null`` \| `string` |
| `full_name` | `undefined` \| ``null`` \| `string` |
| `username` | `undefined` \| ``null`` \| `string` |

#### Defined in

[x-pack/plugins/cases/server/services/user_actions/types.ts:75](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/services/user_actions/types.ts#L75)
