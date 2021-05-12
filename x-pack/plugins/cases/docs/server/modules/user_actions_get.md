[cases](../server_client_api.md) / user_actions/get

# Module: user\_actions/get

## Table of contents

### Functions

- [get](user_actions_get.md#get)

## Functions

### get

▸ `Const` **get**(`__namedParameters`: GetParams, `clientArgs`: CasesClientArgs): *Promise*<{ `action`: ``"add"`` \| ``"create"`` \| ``"delete"`` \| ``"update"`` \| ``"push-to-service"`` ; `action_at`: *string* ; `action_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `action_field`: (``"comment"`` \| ``"owner"`` \| ``"status"`` \| ``"description"`` \| ``"tags"`` \| ``"title"`` \| ``"connector"`` \| ``"settings"`` \| ``"pushed"`` \| ``"sub_case"``)[] ; `new_value`: ``null`` \| *string* ; `old_value`: ``null`` \| *string* ; `owner`: *string*  } & { `action_id`: *string* ; `case_id`: *string* ; `comment_id`: ``null`` \| *string*  } & { `sub_case_id`: *undefined* \| *string*  }[]\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | GetParams |
| `clientArgs` | CasesClientArgs |

**Returns:** *Promise*<{ `action`: ``"add"`` \| ``"create"`` \| ``"delete"`` \| ``"update"`` \| ``"push-to-service"`` ; `action_at`: *string* ; `action_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `action_field`: (``"comment"`` \| ``"owner"`` \| ``"status"`` \| ``"description"`` \| ``"tags"`` \| ``"title"`` \| ``"connector"`` \| ``"settings"`` \| ``"pushed"`` \| ``"sub_case"``)[] ; `new_value`: ``null`` \| *string* ; `old_value`: ``null`` \| *string* ; `owner`: *string*  } & { `action_id`: *string* ; `case_id`: *string* ; `comment_id`: ``null`` \| *string*  } & { `sub_case_id`: *undefined* \| *string*  }[]\>

Defined in: [cases/server/client/user_actions/get.ts:25](https://github.com/jonathan-buttner/kibana/blob/7a61a8b912c/x-pack/plugins/cases/server/client/user_actions/get.ts#L25)
