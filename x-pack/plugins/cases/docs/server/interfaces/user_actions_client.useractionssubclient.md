[cases](../server_client_api.md) / [user_actions/client](../modules/user_actions_client.md) / UserActionsSubClient

# Interface: UserActionsSubClient

[user_actions/client](../modules/user_actions_client.md).UserActionsSubClient

API for interacting the actions performed by a user when interacting with the cases entities.

## Table of contents

### Methods

- [getAll](user_actions_client.useractionssubclient.md#getall)

## Methods

### getAll

▸ **getAll**(`clientArgs`: [*UserActionGet*](user_actions_client.useractionget.md)): *Promise*<{ `action`: ``"add"`` \| ``"create"`` \| ``"delete"`` \| ``"update"`` \| ``"push-to-service"`` ; `action_at`: *string* ; `action_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `action_field`: (``"comment"`` \| ``"owner"`` \| ``"status"`` \| ``"description"`` \| ``"tags"`` \| ``"title"`` \| ``"connector"`` \| ``"settings"`` \| ``"pushed"`` \| ``"sub_case"``)[] ; `new_value`: ``null`` \| *string* ; `old_value`: ``null`` \| *string* ; `owner`: *string*  } & { `action_id`: *string* ; `case_id`: *string* ; `comment_id`: ``null`` \| *string*  } & { `sub_case_id`: *undefined* \| *string*  }[]\>

Retrieves all user actions for a particular case.

#### Parameters

| Name | Type |
| :------ | :------ |
| `clientArgs` | [*UserActionGet*](user_actions_client.useractionget.md) |

**Returns:** *Promise*<{ `action`: ``"add"`` \| ``"create"`` \| ``"delete"`` \| ``"update"`` \| ``"push-to-service"`` ; `action_at`: *string* ; `action_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `action_field`: (``"comment"`` \| ``"owner"`` \| ``"status"`` \| ``"description"`` \| ``"tags"`` \| ``"title"`` \| ``"connector"`` \| ``"settings"`` \| ``"pushed"`` \| ``"sub_case"``)[] ; `new_value`: ``null`` \| *string* ; `old_value`: ``null`` \| *string* ; `owner`: *string*  } & { `action_id`: *string* ; `case_id`: *string* ; `comment_id`: ``null`` \| *string*  } & { `sub_case_id`: *undefined* \| *string*  }[]\>

Defined in: [cases/server/client/user_actions/client.ts:32](https://github.com/jonathan-buttner/kibana/blob/7a61a8b912c/x-pack/plugins/cases/server/client/user_actions/client.ts#L32)
