[Cases Client API Interface](../cases_client_api.md) / [user_actions/client](../modules/user_actions_client.md) / UserActionsSubClient

# Interface: UserActionsSubClient

[user_actions/client](../modules/user_actions_client.md).UserActionsSubClient

API for interacting the actions performed by a user when interacting with the cases entities.

## Table of contents

### Methods

- [getAll](user_actions_client.useractionssubclient.md#getall)

## Methods

### getAll

▸ **getAll**(`clientArgs`: [*UserActionGet*](user_actions_client.useractionget.md)): *Promise*<[*ICaseUserActionsResponse*](typedoc_interfaces.icaseuseractionsresponse.md)\>

Retrieves all user actions for a particular case.

#### Parameters

| Name | Type |
| :------ | :------ |
| `clientArgs` | [*UserActionGet*](user_actions_client.useractionget.md) |

**Returns:** *Promise*<[*ICaseUserActionsResponse*](typedoc_interfaces.icaseuseractionsresponse.md)\>

Defined in: [user_actions/client.ts:33](https://github.com/elastic/kibana/blob/a80791aa4cc/x-pack/plugins/cases/server/client/user_actions/client.ts#L33)
