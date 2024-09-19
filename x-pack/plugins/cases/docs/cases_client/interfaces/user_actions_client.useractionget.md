[Cases Client API Interface](../cases_client_api.md) / [user_actions/client](../modules/user_actions_client.md) / UserActionGet

# Interface: UserActionGet

[user_actions/client](../modules/user_actions_client.md).UserActionGet

Parameters for retrieving user actions for a particular case

## Table of contents

### Properties

- [caseId](user_actions_client.useractionget.md#caseid)
- [subCaseId](user_actions_client.useractionget.md#subcaseid)

## Properties

### caseId

• **caseId**: *string*

The ID of the case

Defined in: [user_actions/client.ts:19](https://github.com/elastic/kibana/blob/a80791aa4cc/x-pack/plugins/cases/server/client/user_actions/client.ts#L19)

___

### subCaseId

• `Optional` **subCaseId**: *string*

If specified then a sub case will be used for finding all the user actions

Defined in: [user_actions/client.ts:23](https://github.com/elastic/kibana/blob/a80791aa4cc/x-pack/plugins/cases/server/client/user_actions/client.ts#L23)
