[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_\_internalNamespace](../modules/client.__internalNamespace.md) / GetUserActionItemByDifference

# Interface: GetUserActionItemByDifference

[client](../modules/client.md).[__internalNamespace](../modules/client.__internalNamespace.md).GetUserActionItemByDifference

## Hierarchy

- [`CommonUserActionArgs`](../modules/client.__internalNamespace.md#commonuseractionargs)

  ↳ **`GetUserActionItemByDifference`**

## Table of contents

### Properties

- [action](client.__internalNamespace.GetUserActionItemByDifference.md#action)
- [attachmentId](client.__internalNamespace.GetUserActionItemByDifference.md#attachmentid)
- [caseId](client.__internalNamespace.GetUserActionItemByDifference.md#caseid)
- [connectorId](client.__internalNamespace.GetUserActionItemByDifference.md#connectorid)
- [field](client.__internalNamespace.GetUserActionItemByDifference.md#field)
- [newValue](client.__internalNamespace.GetUserActionItemByDifference.md#newvalue)
- [originalValue](client.__internalNamespace.GetUserActionItemByDifference.md#originalvalue)
- [owner](client.__internalNamespace.GetUserActionItemByDifference.md#owner)
- [unsecuredSavedObjectsClient](client.__internalNamespace.GetUserActionItemByDifference.md#unsecuredsavedobjectsclient)
- [user](client.__internalNamespace.GetUserActionItemByDifference.md#user)

## Properties

### action

• `Optional` **action**: ``"add"`` \| ``"create"`` \| ``"delete"`` \| ``"update"`` \| ``"push_to_service"``

#### Inherited from

CommonUserActionArgs.action

#### Defined in

[x-pack/plugins/cases/server/services/user_actions/types.ts:80](https://github.com/elastic/kibana/blob/06b0f975f60/x-pack/plugins/cases/server/services/user_actions/types.ts#L80)

___

### attachmentId

• `Optional` **attachmentId**: `string`

#### Inherited from

CommonUserActionArgs.attachmentId

#### Defined in

[x-pack/plugins/cases/server/services/user_actions/types.ts:78](https://github.com/elastic/kibana/blob/06b0f975f60/x-pack/plugins/cases/server/services/user_actions/types.ts#L78)

___

### caseId

• **caseId**: `string`

#### Inherited from

CommonUserActionArgs.caseId

#### Defined in

[x-pack/plugins/cases/server/services/user_actions/types.ts:76](https://github.com/elastic/kibana/blob/06b0f975f60/x-pack/plugins/cases/server/services/user_actions/types.ts#L76)

___

### connectorId

• `Optional` **connectorId**: `string`

#### Inherited from

CommonUserActionArgs.connectorId

#### Defined in

[x-pack/plugins/cases/server/services/user_actions/types.ts:79](https://github.com/elastic/kibana/blob/06b0f975f60/x-pack/plugins/cases/server/services/user_actions/types.ts#L79)

___

### field

• **field**: `string`

#### Defined in

[x-pack/plugins/cases/server/services/user_actions/index.ts:83](https://github.com/elastic/kibana/blob/06b0f975f60/x-pack/plugins/cases/server/services/user_actions/index.ts#L83)

___

### newValue

• **newValue**: `unknown`

#### Defined in

[x-pack/plugins/cases/server/services/user_actions/index.ts:85](https://github.com/elastic/kibana/blob/06b0f975f60/x-pack/plugins/cases/server/services/user_actions/index.ts#L85)

___

### originalValue

• **originalValue**: `unknown`

#### Defined in

[x-pack/plugins/cases/server/services/user_actions/index.ts:84](https://github.com/elastic/kibana/blob/06b0f975f60/x-pack/plugins/cases/server/services/user_actions/index.ts#L84)

___

### owner

• **owner**: `string`

#### Inherited from

CommonUserActionArgs.owner

#### Defined in

[x-pack/plugins/cases/server/services/user_actions/types.ts:77](https://github.com/elastic/kibana/blob/06b0f975f60/x-pack/plugins/cases/server/services/user_actions/types.ts#L77)

___

### unsecuredSavedObjectsClient

• **unsecuredSavedObjectsClient**: [`SavedObjectsClientContract`](../modules/client.__internalNamespace.md#savedobjectsclientcontract)

#### Inherited from

CommonUserActionArgs.unsecuredSavedObjectsClient

#### Defined in

[x-pack/plugins/cases/server/services/index.ts:19](https://github.com/elastic/kibana/blob/06b0f975f60/x-pack/plugins/cases/server/services/index.ts#L19)

___

### user

• **user**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `email` | `undefined` \| ``null`` \| `string` |
| `full_name` | `undefined` \| ``null`` \| `string` |
| `username` | `undefined` \| ``null`` \| `string` |

#### Inherited from

CommonUserActionArgs.user

#### Defined in

[x-pack/plugins/cases/server/services/user_actions/types.ts:75](https://github.com/elastic/kibana/blob/06b0f975f60/x-pack/plugins/cases/server/services/user_actions/types.ts#L75)
