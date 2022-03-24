[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_internal\_namespace](../modules/client._internal_namespace.md) / GetUserActionItemByDifference

# Interface: GetUserActionItemByDifference

[client](../modules/client.md).[_internal_namespace](../modules/client._internal_namespace.md).GetUserActionItemByDifference

## Hierarchy

- [`CommonUserActionArgs`](../modules/client._internal_namespace.md#commonuseractionargs)

  ↳ **`GetUserActionItemByDifference`**

## Table of contents

### Properties

- [action](client._internal_namespace.GetUserActionItemByDifference.md#action)
- [attachmentId](client._internal_namespace.GetUserActionItemByDifference.md#attachmentid)
- [caseId](client._internal_namespace.GetUserActionItemByDifference.md#caseid)
- [connectorId](client._internal_namespace.GetUserActionItemByDifference.md#connectorid)
- [field](client._internal_namespace.GetUserActionItemByDifference.md#field)
- [newValue](client._internal_namespace.GetUserActionItemByDifference.md#newvalue)
- [originalValue](client._internal_namespace.GetUserActionItemByDifference.md#originalvalue)
- [owner](client._internal_namespace.GetUserActionItemByDifference.md#owner)
- [unsecuredSavedObjectsClient](client._internal_namespace.GetUserActionItemByDifference.md#unsecuredsavedobjectsclient)
- [user](client._internal_namespace.GetUserActionItemByDifference.md#user)

## Properties

### action

• `Optional` **action**: ``"add"`` \| ``"create"`` \| ``"delete"`` \| ``"update"`` \| ``"push_to_service"``

#### Inherited from

CommonUserActionArgs.action

#### Defined in

[x-pack/plugins/cases/server/services/user_actions/types.ts:80](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/services/user_actions/types.ts#L80)

___

### attachmentId

• `Optional` **attachmentId**: `string`

#### Inherited from

CommonUserActionArgs.attachmentId

#### Defined in

[x-pack/plugins/cases/server/services/user_actions/types.ts:78](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/services/user_actions/types.ts#L78)

___

### caseId

• **caseId**: `string`

#### Inherited from

CommonUserActionArgs.caseId

#### Defined in

[x-pack/plugins/cases/server/services/user_actions/types.ts:76](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/services/user_actions/types.ts#L76)

___

### connectorId

• `Optional` **connectorId**: `string`

#### Inherited from

CommonUserActionArgs.connectorId

#### Defined in

[x-pack/plugins/cases/server/services/user_actions/types.ts:79](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/services/user_actions/types.ts#L79)

___

### field

• **field**: `string`

#### Defined in

[x-pack/plugins/cases/server/services/user_actions/index.ts:83](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/services/user_actions/index.ts#L83)

___

### newValue

• **newValue**: `unknown`

#### Defined in

[x-pack/plugins/cases/server/services/user_actions/index.ts:85](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/services/user_actions/index.ts#L85)

___

### originalValue

• **originalValue**: `unknown`

#### Defined in

[x-pack/plugins/cases/server/services/user_actions/index.ts:84](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/services/user_actions/index.ts#L84)

___

### owner

• **owner**: `string`

#### Inherited from

CommonUserActionArgs.owner

#### Defined in

[x-pack/plugins/cases/server/services/user_actions/types.ts:77](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/services/user_actions/types.ts#L77)

___

### unsecuredSavedObjectsClient

• **unsecuredSavedObjectsClient**: [`SavedObjectsClientContract`](../modules/client._internal_namespace.md#savedobjectsclientcontract)

#### Inherited from

CommonUserActionArgs.unsecuredSavedObjectsClient

#### Defined in

[x-pack/plugins/cases/server/services/index.ts:19](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/services/index.ts#L19)

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

[x-pack/plugins/cases/server/services/user_actions/types.ts:75](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/services/user_actions/types.ts#L75)
