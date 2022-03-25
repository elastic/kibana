[Cases Client API Interface](../README.md) / [user\_actions/client](../modules/user_actions_client.md) / UserActionsSubClient

# Interface: UserActionsSubClient

[user_actions/client](../modules/user_actions_client.md).UserActionsSubClient

API for interacting the actions performed by a user when interacting with the cases entities.

## Table of contents

### Methods

- [getAll](user_actions_client.UserActionsSubClient.md#getall)

## Methods

### getAll

▸ **getAll**(`clientArgs`): `Promise`<[`ICaseUserActionsResponse`](typedoc_interfaces.ICaseUserActionsResponse.md)\>

Retrieves all user actions for a particular case.

#### Parameters

| Name | Type |
| :------ | :------ |
| `clientArgs` | [`UserActionGet`](user_actions_client.UserActionGet.md) |

#### Returns

`Promise`<[`ICaseUserActionsResponse`](typedoc_interfaces.ICaseUserActionsResponse.md)\>

#### Defined in

[x-pack/plugins/cases/server/client/user_actions/client.ts:29](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/client/user_actions/client.ts#L29)
