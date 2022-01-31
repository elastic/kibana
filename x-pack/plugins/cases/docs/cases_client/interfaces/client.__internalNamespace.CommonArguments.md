[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_\_internalNamespace](../modules/client.__internalNamespace.md) / CommonArguments

# Interface: CommonArguments

[client](../modules/client.md).[__internalNamespace](../modules/client.__internalNamespace.md).CommonArguments

## Table of contents

### Properties

- [action](client.__internalNamespace.CommonArguments.md#action)
- [attachmentId](client.__internalNamespace.CommonArguments.md#attachmentid)
- [caseId](client.__internalNamespace.CommonArguments.md#caseid)
- [connectorId](client.__internalNamespace.CommonArguments.md#connectorid)
- [owner](client.__internalNamespace.CommonArguments.md#owner)
- [user](client.__internalNamespace.CommonArguments.md#user)

## Properties

### action

• `Optional` **action**: ``"add"`` \| ``"create"`` \| ``"delete"`` \| ``"update"`` \| ``"push_to_service"``

#### Defined in

[x-pack/plugins/cases/server/services/user_actions/types.ts:80](https://github.com/elastic/kibana/blob/06b0f975f60/x-pack/plugins/cases/server/services/user_actions/types.ts#L80)

___

### attachmentId

• `Optional` **attachmentId**: `string`

#### Defined in

[x-pack/plugins/cases/server/services/user_actions/types.ts:78](https://github.com/elastic/kibana/blob/06b0f975f60/x-pack/plugins/cases/server/services/user_actions/types.ts#L78)

___

### caseId

• **caseId**: `string`

#### Defined in

[x-pack/plugins/cases/server/services/user_actions/types.ts:76](https://github.com/elastic/kibana/blob/06b0f975f60/x-pack/plugins/cases/server/services/user_actions/types.ts#L76)

___

### connectorId

• `Optional` **connectorId**: `string`

#### Defined in

[x-pack/plugins/cases/server/services/user_actions/types.ts:79](https://github.com/elastic/kibana/blob/06b0f975f60/x-pack/plugins/cases/server/services/user_actions/types.ts#L79)

___

### owner

• **owner**: `string`

#### Defined in

[x-pack/plugins/cases/server/services/user_actions/types.ts:77](https://github.com/elastic/kibana/blob/06b0f975f60/x-pack/plugins/cases/server/services/user_actions/types.ts#L77)

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

[x-pack/plugins/cases/server/services/user_actions/types.ts:75](https://github.com/elastic/kibana/blob/06b0f975f60/x-pack/plugins/cases/server/services/user_actions/types.ts#L75)
