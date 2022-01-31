[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_\_internalNamespace](../modules/client.__internalNamespace.md) / CaseUserActionService

# Class: CaseUserActionService

[client](../modules/client.md).[__internalNamespace](../modules/client.__internalNamespace.md).CaseUserActionService

## Table of contents

### Constructors

- [constructor](client.__internalNamespace.CaseUserActionService.md#constructor)

### Properties

- [builderFactory](client.__internalNamespace.CaseUserActionService.md#builderfactory)
- [userActionFieldsAllowed](client.__internalNamespace.CaseUserActionService.md#useractionfieldsallowed)

### Methods

- [buildCountConnectorsAggs](client.__internalNamespace.CaseUserActionService.md#buildcountconnectorsaggs)
- [bulkCreate](client.__internalNamespace.CaseUserActionService.md#bulkcreate)
- [bulkCreateAttachmentDeletion](client.__internalNamespace.CaseUserActionService.md#bulkcreateattachmentdeletion)
- [bulkCreateCaseDeletion](client.__internalNamespace.CaseUserActionService.md#bulkcreatecasedeletion)
- [bulkCreateUpdateCase](client.__internalNamespace.CaseUserActionService.md#bulkcreateupdatecase)
- [create](client.__internalNamespace.CaseUserActionService.md#create)
- [createUserAction](client.__internalNamespace.CaseUserActionService.md#createuseraction)
- [findStatusChanges](client.__internalNamespace.CaseUserActionService.md#findstatuschanges)
- [getAll](client.__internalNamespace.CaseUserActionService.md#getall)
- [getUniqueConnectors](client.__internalNamespace.CaseUserActionService.md#getuniqueconnectors)
- [getUserActionItemByDifference](client.__internalNamespace.CaseUserActionService.md#getuseractionitembydifference)

## Constructors

### constructor

• **new CaseUserActionService**(`log`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `log` | `Logger` |

#### Defined in

[x-pack/plugins/cases/server/services/user_actions/index.ts:106](https://github.com/elastic/kibana/blob/06b0f975f60/x-pack/plugins/cases/server/services/user_actions/index.ts#L106)

## Properties

### builderFactory

• `Private` `Readonly` **builderFactory**: [`BuilderFactory`](client.__internalNamespace.BuilderFactory.md)

#### Defined in

[x-pack/plugins/cases/server/services/user_actions/index.ts:104](https://github.com/elastic/kibana/blob/06b0f975f60/x-pack/plugins/cases/server/services/user_actions/index.ts#L104)

___

### userActionFieldsAllowed

▪ `Static` `Private` `Readonly` **userActionFieldsAllowed**: `Set`<`string`\>

#### Defined in

[x-pack/plugins/cases/server/services/user_actions/index.ts:102](https://github.com/elastic/kibana/blob/06b0f975f60/x-pack/plugins/cases/server/services/user_actions/index.ts#L102)

## Methods

### buildCountConnectorsAggs

▸ `Private` **buildCountConnectorsAggs**(`size?`): `Record`<`string`, `AggregationsAggregationContainer`\>

#### Parameters

| Name | Type | Default value |
| :------ | :------ | :------ |
| `size` | `number` | `100` |

#### Returns

`Record`<`string`, `AggregationsAggregationContainer`\>

#### Defined in

[x-pack/plugins/cases/server/services/user_actions/index.ts:470](https://github.com/elastic/kibana/blob/06b0f975f60/x-pack/plugins/cases/server/services/user_actions/index.ts#L470)

___

### bulkCreate

▸ **bulkCreate**(`__namedParameters`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [`PostCaseUserActionArgs`](../interfaces/client.__internalNamespace.PostCaseUserActionArgs.md) |

#### Returns

`Promise`<`void`\>

#### Defined in

[x-pack/plugins/cases/server/services/user_actions/index.ts:352](https://github.com/elastic/kibana/blob/06b0f975f60/x-pack/plugins/cases/server/services/user_actions/index.ts#L352)

___

### bulkCreateAttachmentDeletion

▸ **bulkCreateAttachmentDeletion**(`__namedParameters`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [`BulkCreateAttachmentDeletionUserAction`](../interfaces/client.__internalNamespace.BulkCreateAttachmentDeletionUserAction.md) |

#### Returns

`Promise`<`void`\>

#### Defined in

[x-pack/plugins/cases/server/services/user_actions/index.ts:244](https://github.com/elastic/kibana/blob/06b0f975f60/x-pack/plugins/cases/server/services/user_actions/index.ts#L244)

___

### bulkCreateCaseDeletion

▸ **bulkCreateCaseDeletion**(`__namedParameters`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [`BulkCreateCaseDeletionUserAction`](../interfaces/client.__internalNamespace.BulkCreateCaseDeletionUserAction.md) |

#### Returns

`Promise`<`void`\>

#### Defined in

[x-pack/plugins/cases/server/services/user_actions/index.ts:171](https://github.com/elastic/kibana/blob/06b0f975f60/x-pack/plugins/cases/server/services/user_actions/index.ts#L171)

___

### bulkCreateUpdateCase

▸ **bulkCreateUpdateCase**(`__namedParameters`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [`BulkCreateBulkUpdateCaseUserActions`](../interfaces/client.__internalNamespace.BulkCreateBulkUpdateCaseUserActions.md) |

#### Returns

`Promise`<`void`\>

#### Defined in

[x-pack/plugins/cases/server/services/user_actions/index.ts:198](https://github.com/elastic/kibana/blob/06b0f975f60/x-pack/plugins/cases/server/services/user_actions/index.ts#L198)

___

### create

▸ **create**<`T`\>(`__namedParameters`): `Promise`<`void`\>

#### Type parameters

| Name |
| :------ |
| `T` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [`CreateUserActionES`](../interfaces/client.__internalNamespace.CreateUserActionES.md)<`T`\> |

#### Returns

`Promise`<`void`\>

#### Defined in

[x-pack/plugins/cases/server/services/user_actions/index.ts:335](https://github.com/elastic/kibana/blob/06b0f975f60/x-pack/plugins/cases/server/services/user_actions/index.ts#L335)

___

### createUserAction

▸ **createUserAction**<`T`\>(`__namedParameters`): `Promise`<`void`\>

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | extends keyof [`BuilderParameters`](../interfaces/client.__internalNamespace.BuilderParameters.md) |

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [`CreateUserActionClient`](../modules/client.__internalNamespace.md#createuseractionclient)<`T`\> |

#### Returns

`Promise`<`void`\>

#### Defined in

[x-pack/plugins/cases/server/services/user_actions/index.ts:275](https://github.com/elastic/kibana/blob/06b0f975f60/x-pack/plugins/cases/server/services/user_actions/index.ts#L275)

___

### findStatusChanges

▸ **findStatusChanges**(`__namedParameters`): `Promise`<[`SavedObject`](../interfaces/client.__internalNamespace.SavedObject.md)<{ `payload`: { description: string; } = DescriptionUserActionPayloadRt; `type`: ``"description"``  } & { `action`: ``"add"`` \| ``"create"`` \| ``"delete"`` \| ``"update"`` \| ``"push_to_service"`` = ActionsRt; `created_at`: `string` = rt.string; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } = UserRT; `owner`: `string` = rt.string } & { `action_id`: `string` = rt.string; `case_id`: `string` = rt.string; `comment_id`: ``null`` \| `string`  } & { `payload`: { comment: { comment: string; type: CommentType.user; owner: string; } \| { type: CommentType.alert; alertId: string \| string[]; index: string \| string[]; rule: { id: string \| null; name: string \| null; }; owner: string; } \| { ...; }; } = CommentUserActionPayloadRt; `type`: ``"comment"``  } & { `action`: ``"add"`` \| ``"create"`` \| ``"delete"`` \| ``"update"`` \| ``"push_to_service"`` = ActionsRt; `created_at`: `string` = rt.string; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } = UserRT; `owner`: `string` = rt.string } & { `action_id`: `string` = rt.string; `case_id`: `string` = rt.string; `comment_id`: ``null`` \| `string`  } & { `payload`: { tags: string[]; } = TagsUserActionPayloadRt; `type`: ``"tags"``  } & { `action`: ``"add"`` \| ``"create"`` \| ``"delete"`` \| ``"update"`` \| ``"push_to_service"`` = ActionsRt; `created_at`: `string` = rt.string; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } = UserRT; `owner`: `string` = rt.string } & { `action_id`: `string` = rt.string; `case_id`: `string` = rt.string; `comment_id`: ``null`` \| `string`  } & { `payload`: { title: string; } = TitleUserActionPayloadRt; `type`: ``"title"``  } & { `action`: ``"add"`` \| ``"create"`` \| ``"delete"`` \| ``"update"`` \| ``"push_to_service"`` = ActionsRt; `created_at`: `string` = rt.string; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } = UserRT; `owner`: `string` = rt.string } & { `action_id`: `string` = rt.string; `case_id`: `string` = rt.string; `comment_id`: ``null`` \| `string`  } & { `payload`: { settings: { syncAlerts: boolean; }; } = SettingsUserActionPayloadRt; `type`: ``"settings"``  } & { `action`: ``"add"`` \| ``"create"`` \| ``"delete"`` \| ``"update"`` \| ``"push_to_service"`` = ActionsRt; `created_at`: `string` = rt.string; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } = UserRT; `owner`: `string` = rt.string } & { `action_id`: `string` = rt.string; `case_id`: `string` = rt.string; `comment_id`: ``null`` \| `string`  } & { `payload`: { status: CaseStatuses; } = StatusUserActionPayloadRt; `type`: ``"status"``  } & { `action`: ``"add"`` \| ``"create"`` \| ``"delete"`` \| ``"update"`` \| ``"push_to_service"`` = ActionsRt; `created_at`: `string` = rt.string; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } = UserRT; `owner`: `string` = rt.string } & { `action_id`: `string` = rt.string; `case_id`: `string` = rt.string; `comment_id`: ``null`` \| `string`  } & { `type`: ``"create_case"``  } & { `payload`: { connector: { id: string; } & (({ type: ConnectorTypes.jira; fields: { issueType: string \| null; priority: string \| null; parent: string \| null; } \| null; } & { name: string; }) \| ... 4 more ... \| ({ ...; } & { ...; })); } & { description: string; status: string; tags: string[]; title: string; settings: { syncAlerts: boolean; }; owner: string; }  } & { `action`: ``"add"`` \| ``"create"`` \| ``"delete"`` \| ``"update"`` \| ``"push_to_service"`` = ActionsRt; `created_at`: `string` = rt.string; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } = UserRT; `owner`: `string` = rt.string } & { `action_id`: `string` = rt.string; `case_id`: `string` = rt.string; `comment_id`: ``null`` \| `string`  } & { `payload`: { connector: { id: string; } & (({ type: ConnectorTypes.jira; fields: { issueType: string \| null; priority: string \| null; parent: string \| null; } \| null; } & { name: string; }) \| ... 4 more ... \| ({ ...; } & { ...; })); } = ConnectorUserActionPayloadRt; `type`: ``"connector"``  } & { `action`: ``"add"`` \| ``"create"`` \| ``"delete"`` \| ``"update"`` \| ``"push_to_service"`` = ActionsRt; `created_at`: `string` = rt.string; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } = UserRT; `owner`: `string` = rt.string } & { `action_id`: `string` = rt.string; `case_id`: `string` = rt.string; `comment_id`: ``null`` \| `string`  } & { `payload`: { externalService: { connector\_id: string; } & { connector\_name: string; external\_id: string; external\_title: string; external\_url: string; pushed\_at: string; pushed\_by: { email: string \| null \| undefined; full\_name: string \| ... 1 more ... \| undefined; username: string \| ... 1 more ... \| undefined; }; }; } = PushedUserActionPayloadRt; `type`: ``"pushed"``  } & { `action`: ``"add"`` \| ``"create"`` \| ``"delete"`` \| ``"update"`` \| ``"push_to_service"`` = ActionsRt; `created_at`: `string` = rt.string; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } = UserRT; `owner`: `string` = rt.string } & { `action_id`: `string` = rt.string; `case_id`: `string` = rt.string; `comment_id`: ``null`` \| `string`  } & { `payload`: {} ; `type`: ``"delete_case"``  } & { `action`: ``"add"`` \| ``"create"`` \| ``"delete"`` \| ``"update"`` \| ``"push_to_service"`` = ActionsRt; `created_at`: `string` = rt.string; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } = UserRT; `owner`: `string` = rt.string } & { `action_id`: `string` = rt.string; `case_id`: `string` = rt.string; `comment_id`: ``null`` \| `string`  }\>[]\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | `Object` |
| `__namedParameters.caseId` | `string` |
| `__namedParameters.filter?` | `KueryNode` |
| `__namedParameters.unsecuredSavedObjectsClient` | [`SavedObjectsClientContract`](../modules/client.__internalNamespace.md#savedobjectsclientcontract) |

#### Returns

`Promise`<[`SavedObject`](../interfaces/client.__internalNamespace.SavedObject.md)<{ `payload`: { description: string; } = DescriptionUserActionPayloadRt; `type`: ``"description"``  } & { `action`: ``"add"`` \| ``"create"`` \| ``"delete"`` \| ``"update"`` \| ``"push_to_service"`` = ActionsRt; `created_at`: `string` = rt.string; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } = UserRT; `owner`: `string` = rt.string } & { `action_id`: `string` = rt.string; `case_id`: `string` = rt.string; `comment_id`: ``null`` \| `string`  } & { `payload`: { comment: { comment: string; type: CommentType.user; owner: string; } \| { type: CommentType.alert; alertId: string \| string[]; index: string \| string[]; rule: { id: string \| null; name: string \| null; }; owner: string; } \| { ...; }; } = CommentUserActionPayloadRt; `type`: ``"comment"``  } & { `action`: ``"add"`` \| ``"create"`` \| ``"delete"`` \| ``"update"`` \| ``"push_to_service"`` = ActionsRt; `created_at`: `string` = rt.string; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } = UserRT; `owner`: `string` = rt.string } & { `action_id`: `string` = rt.string; `case_id`: `string` = rt.string; `comment_id`: ``null`` \| `string`  } & { `payload`: { tags: string[]; } = TagsUserActionPayloadRt; `type`: ``"tags"``  } & { `action`: ``"add"`` \| ``"create"`` \| ``"delete"`` \| ``"update"`` \| ``"push_to_service"`` = ActionsRt; `created_at`: `string` = rt.string; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } = UserRT; `owner`: `string` = rt.string } & { `action_id`: `string` = rt.string; `case_id`: `string` = rt.string; `comment_id`: ``null`` \| `string`  } & { `payload`: { title: string; } = TitleUserActionPayloadRt; `type`: ``"title"``  } & { `action`: ``"add"`` \| ``"create"`` \| ``"delete"`` \| ``"update"`` \| ``"push_to_service"`` = ActionsRt; `created_at`: `string` = rt.string; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } = UserRT; `owner`: `string` = rt.string } & { `action_id`: `string` = rt.string; `case_id`: `string` = rt.string; `comment_id`: ``null`` \| `string`  } & { `payload`: { settings: { syncAlerts: boolean; }; } = SettingsUserActionPayloadRt; `type`: ``"settings"``  } & { `action`: ``"add"`` \| ``"create"`` \| ``"delete"`` \| ``"update"`` \| ``"push_to_service"`` = ActionsRt; `created_at`: `string` = rt.string; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } = UserRT; `owner`: `string` = rt.string } & { `action_id`: `string` = rt.string; `case_id`: `string` = rt.string; `comment_id`: ``null`` \| `string`  } & { `payload`: { status: CaseStatuses; } = StatusUserActionPayloadRt; `type`: ``"status"``  } & { `action`: ``"add"`` \| ``"create"`` \| ``"delete"`` \| ``"update"`` \| ``"push_to_service"`` = ActionsRt; `created_at`: `string` = rt.string; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } = UserRT; `owner`: `string` = rt.string } & { `action_id`: `string` = rt.string; `case_id`: `string` = rt.string; `comment_id`: ``null`` \| `string`  } & { `type`: ``"create_case"``  } & { `payload`: { connector: { id: string; } & (({ type: ConnectorTypes.jira; fields: { issueType: string \| null; priority: string \| null; parent: string \| null; } \| null; } & { name: string; }) \| ... 4 more ... \| ({ ...; } & { ...; })); } & { description: string; status: string; tags: string[]; title: string; settings: { syncAlerts: boolean; }; owner: string; }  } & { `action`: ``"add"`` \| ``"create"`` \| ``"delete"`` \| ``"update"`` \| ``"push_to_service"`` = ActionsRt; `created_at`: `string` = rt.string; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } = UserRT; `owner`: `string` = rt.string } & { `action_id`: `string` = rt.string; `case_id`: `string` = rt.string; `comment_id`: ``null`` \| `string`  } & { `payload`: { connector: { id: string; } & (({ type: ConnectorTypes.jira; fields: { issueType: string \| null; priority: string \| null; parent: string \| null; } \| null; } & { name: string; }) \| ... 4 more ... \| ({ ...; } & { ...; })); } = ConnectorUserActionPayloadRt; `type`: ``"connector"``  } & { `action`: ``"add"`` \| ``"create"`` \| ``"delete"`` \| ``"update"`` \| ``"push_to_service"`` = ActionsRt; `created_at`: `string` = rt.string; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } = UserRT; `owner`: `string` = rt.string } & { `action_id`: `string` = rt.string; `case_id`: `string` = rt.string; `comment_id`: ``null`` \| `string`  } & { `payload`: { externalService: { connector\_id: string; } & { connector\_name: string; external\_id: string; external\_title: string; external\_url: string; pushed\_at: string; pushed\_by: { email: string \| null \| undefined; full\_name: string \| ... 1 more ... \| undefined; username: string \| ... 1 more ... \| undefined; }; }; } = PushedUserActionPayloadRt; `type`: ``"pushed"``  } & { `action`: ``"add"`` \| ``"create"`` \| ``"delete"`` \| ``"update"`` \| ``"push_to_service"`` = ActionsRt; `created_at`: `string` = rt.string; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } = UserRT; `owner`: `string` = rt.string } & { `action_id`: `string` = rt.string; `case_id`: `string` = rt.string; `comment_id`: ``null`` \| `string`  } & { `payload`: {} ; `type`: ``"delete_case"``  } & { `action`: ``"add"`` \| ``"create"`` \| ``"delete"`` \| ``"update"`` \| ``"push_to_service"`` = ActionsRt; `created_at`: `string` = rt.string; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } = UserRT; `owner`: `string` = rt.string } & { `action_id`: `string` = rt.string; `case_id`: `string` = rt.string; `comment_id`: ``null`` \| `string`  }\>[]\>

#### Defined in

[x-pack/plugins/cases/server/services/user_actions/index.ts:372](https://github.com/elastic/kibana/blob/06b0f975f60/x-pack/plugins/cases/server/services/user_actions/index.ts#L372)

___

### getAll

▸ **getAll**(`__namedParameters`): `Promise`<[`SavedObjectsFindResponse`](../interfaces/client.__internalNamespace.SavedObjectsFindResponse.md)<{ `payload`: { description: string; } = DescriptionUserActionPayloadRt; `type`: ``"description"``  } & { `action`: ``"add"`` \| ``"create"`` \| ``"delete"`` \| ``"update"`` \| ``"push_to_service"`` = ActionsRt; `created_at`: `string` = rt.string; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } = UserRT; `owner`: `string` = rt.string } & { `action_id`: `string` = rt.string; `case_id`: `string` = rt.string; `comment_id`: ``null`` \| `string`  } & { `payload`: { comment: { comment: string; type: CommentType.user; owner: string; } \| { type: CommentType.alert; alertId: string \| string[]; index: string \| string[]; rule: { id: string \| null; name: string \| null; }; owner: string; } \| { ...; }; } = CommentUserActionPayloadRt; `type`: ``"comment"``  } & { `action`: ``"add"`` \| ``"create"`` \| ``"delete"`` \| ``"update"`` \| ``"push_to_service"`` = ActionsRt; `created_at`: `string` = rt.string; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } = UserRT; `owner`: `string` = rt.string } & { `action_id`: `string` = rt.string; `case_id`: `string` = rt.string; `comment_id`: ``null`` \| `string`  } & { `payload`: { tags: string[]; } = TagsUserActionPayloadRt; `type`: ``"tags"``  } & { `action`: ``"add"`` \| ``"create"`` \| ``"delete"`` \| ``"update"`` \| ``"push_to_service"`` = ActionsRt; `created_at`: `string` = rt.string; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } = UserRT; `owner`: `string` = rt.string } & { `action_id`: `string` = rt.string; `case_id`: `string` = rt.string; `comment_id`: ``null`` \| `string`  } & { `payload`: { title: string; } = TitleUserActionPayloadRt; `type`: ``"title"``  } & { `action`: ``"add"`` \| ``"create"`` \| ``"delete"`` \| ``"update"`` \| ``"push_to_service"`` = ActionsRt; `created_at`: `string` = rt.string; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } = UserRT; `owner`: `string` = rt.string } & { `action_id`: `string` = rt.string; `case_id`: `string` = rt.string; `comment_id`: ``null`` \| `string`  } & { `payload`: { settings: { syncAlerts: boolean; }; } = SettingsUserActionPayloadRt; `type`: ``"settings"``  } & { `action`: ``"add"`` \| ``"create"`` \| ``"delete"`` \| ``"update"`` \| ``"push_to_service"`` = ActionsRt; `created_at`: `string` = rt.string; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } = UserRT; `owner`: `string` = rt.string } & { `action_id`: `string` = rt.string; `case_id`: `string` = rt.string; `comment_id`: ``null`` \| `string`  } & { `payload`: { status: CaseStatuses; } = StatusUserActionPayloadRt; `type`: ``"status"``  } & { `action`: ``"add"`` \| ``"create"`` \| ``"delete"`` \| ``"update"`` \| ``"push_to_service"`` = ActionsRt; `created_at`: `string` = rt.string; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } = UserRT; `owner`: `string` = rt.string } & { `action_id`: `string` = rt.string; `case_id`: `string` = rt.string; `comment_id`: ``null`` \| `string`  } & { `type`: ``"create_case"``  } & { `payload`: { connector: { id: string; } & (({ type: ConnectorTypes.jira; fields: { issueType: string \| null; priority: string \| null; parent: string \| null; } \| null; } & { name: string; }) \| ... 4 more ... \| ({ ...; } & { ...; })); } & { description: string; status: string; tags: string[]; title: string; settings: { syncAlerts: boolean; }; owner: string; }  } & { `action`: ``"add"`` \| ``"create"`` \| ``"delete"`` \| ``"update"`` \| ``"push_to_service"`` = ActionsRt; `created_at`: `string` = rt.string; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } = UserRT; `owner`: `string` = rt.string } & { `action_id`: `string` = rt.string; `case_id`: `string` = rt.string; `comment_id`: ``null`` \| `string`  } & { `payload`: { connector: { id: string; } & (({ type: ConnectorTypes.jira; fields: { issueType: string \| null; priority: string \| null; parent: string \| null; } \| null; } & { name: string; }) \| ... 4 more ... \| ({ ...; } & { ...; })); } = ConnectorUserActionPayloadRt; `type`: ``"connector"``  } & { `action`: ``"add"`` \| ``"create"`` \| ``"delete"`` \| ``"update"`` \| ``"push_to_service"`` = ActionsRt; `created_at`: `string` = rt.string; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } = UserRT; `owner`: `string` = rt.string } & { `action_id`: `string` = rt.string; `case_id`: `string` = rt.string; `comment_id`: ``null`` \| `string`  } & { `payload`: { externalService: { connector\_id: string; } & { connector\_name: string; external\_id: string; external\_title: string; external\_url: string; pushed\_at: string; pushed\_by: { email: string \| null \| undefined; full\_name: string \| ... 1 more ... \| undefined; username: string \| ... 1 more ... \| undefined; }; }; } = PushedUserActionPayloadRt; `type`: ``"pushed"``  } & { `action`: ``"add"`` \| ``"create"`` \| ``"delete"`` \| ``"update"`` \| ``"push_to_service"`` = ActionsRt; `created_at`: `string` = rt.string; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } = UserRT; `owner`: `string` = rt.string } & { `action_id`: `string` = rt.string; `case_id`: `string` = rt.string; `comment_id`: ``null`` \| `string`  } & { `payload`: {} ; `type`: ``"delete_case"``  } & { `action`: ``"add"`` \| ``"create"`` \| ``"delete"`` \| ``"update"`` \| ``"push_to_service"`` = ActionsRt; `created_at`: `string` = rt.string; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } = UserRT; `owner`: `string` = rt.string } & { `action_id`: `string` = rt.string; `case_id`: `string` = rt.string; `comment_id`: ``null`` \| `string`  }, `unknown`\>\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [`GetCaseUserActionArgs`](../interfaces/client.__internalNamespace.GetCaseUserActionArgs.md) |

#### Returns

`Promise`<[`SavedObjectsFindResponse`](../interfaces/client.__internalNamespace.SavedObjectsFindResponse.md)<{ `payload`: { description: string; } = DescriptionUserActionPayloadRt; `type`: ``"description"``  } & { `action`: ``"add"`` \| ``"create"`` \| ``"delete"`` \| ``"update"`` \| ``"push_to_service"`` = ActionsRt; `created_at`: `string` = rt.string; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } = UserRT; `owner`: `string` = rt.string } & { `action_id`: `string` = rt.string; `case_id`: `string` = rt.string; `comment_id`: ``null`` \| `string`  } & { `payload`: { comment: { comment: string; type: CommentType.user; owner: string; } \| { type: CommentType.alert; alertId: string \| string[]; index: string \| string[]; rule: { id: string \| null; name: string \| null; }; owner: string; } \| { ...; }; } = CommentUserActionPayloadRt; `type`: ``"comment"``  } & { `action`: ``"add"`` \| ``"create"`` \| ``"delete"`` \| ``"update"`` \| ``"push_to_service"`` = ActionsRt; `created_at`: `string` = rt.string; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } = UserRT; `owner`: `string` = rt.string } & { `action_id`: `string` = rt.string; `case_id`: `string` = rt.string; `comment_id`: ``null`` \| `string`  } & { `payload`: { tags: string[]; } = TagsUserActionPayloadRt; `type`: ``"tags"``  } & { `action`: ``"add"`` \| ``"create"`` \| ``"delete"`` \| ``"update"`` \| ``"push_to_service"`` = ActionsRt; `created_at`: `string` = rt.string; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } = UserRT; `owner`: `string` = rt.string } & { `action_id`: `string` = rt.string; `case_id`: `string` = rt.string; `comment_id`: ``null`` \| `string`  } & { `payload`: { title: string; } = TitleUserActionPayloadRt; `type`: ``"title"``  } & { `action`: ``"add"`` \| ``"create"`` \| ``"delete"`` \| ``"update"`` \| ``"push_to_service"`` = ActionsRt; `created_at`: `string` = rt.string; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } = UserRT; `owner`: `string` = rt.string } & { `action_id`: `string` = rt.string; `case_id`: `string` = rt.string; `comment_id`: ``null`` \| `string`  } & { `payload`: { settings: { syncAlerts: boolean; }; } = SettingsUserActionPayloadRt; `type`: ``"settings"``  } & { `action`: ``"add"`` \| ``"create"`` \| ``"delete"`` \| ``"update"`` \| ``"push_to_service"`` = ActionsRt; `created_at`: `string` = rt.string; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } = UserRT; `owner`: `string` = rt.string } & { `action_id`: `string` = rt.string; `case_id`: `string` = rt.string; `comment_id`: ``null`` \| `string`  } & { `payload`: { status: CaseStatuses; } = StatusUserActionPayloadRt; `type`: ``"status"``  } & { `action`: ``"add"`` \| ``"create"`` \| ``"delete"`` \| ``"update"`` \| ``"push_to_service"`` = ActionsRt; `created_at`: `string` = rt.string; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } = UserRT; `owner`: `string` = rt.string } & { `action_id`: `string` = rt.string; `case_id`: `string` = rt.string; `comment_id`: ``null`` \| `string`  } & { `type`: ``"create_case"``  } & { `payload`: { connector: { id: string; } & (({ type: ConnectorTypes.jira; fields: { issueType: string \| null; priority: string \| null; parent: string \| null; } \| null; } & { name: string; }) \| ... 4 more ... \| ({ ...; } & { ...; })); } & { description: string; status: string; tags: string[]; title: string; settings: { syncAlerts: boolean; }; owner: string; }  } & { `action`: ``"add"`` \| ``"create"`` \| ``"delete"`` \| ``"update"`` \| ``"push_to_service"`` = ActionsRt; `created_at`: `string` = rt.string; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } = UserRT; `owner`: `string` = rt.string } & { `action_id`: `string` = rt.string; `case_id`: `string` = rt.string; `comment_id`: ``null`` \| `string`  } & { `payload`: { connector: { id: string; } & (({ type: ConnectorTypes.jira; fields: { issueType: string \| null; priority: string \| null; parent: string \| null; } \| null; } & { name: string; }) \| ... 4 more ... \| ({ ...; } & { ...; })); } = ConnectorUserActionPayloadRt; `type`: ``"connector"``  } & { `action`: ``"add"`` \| ``"create"`` \| ``"delete"`` \| ``"update"`` \| ``"push_to_service"`` = ActionsRt; `created_at`: `string` = rt.string; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } = UserRT; `owner`: `string` = rt.string } & { `action_id`: `string` = rt.string; `case_id`: `string` = rt.string; `comment_id`: ``null`` \| `string`  } & { `payload`: { externalService: { connector\_id: string; } & { connector\_name: string; external\_id: string; external\_title: string; external\_url: string; pushed\_at: string; pushed\_by: { email: string \| null \| undefined; full\_name: string \| ... 1 more ... \| undefined; username: string \| ... 1 more ... \| undefined; }; }; } = PushedUserActionPayloadRt; `type`: ``"pushed"``  } & { `action`: ``"add"`` \| ``"create"`` \| ``"delete"`` \| ``"update"`` \| ``"push_to_service"`` = ActionsRt; `created_at`: `string` = rt.string; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } = UserRT; `owner`: `string` = rt.string } & { `action_id`: `string` = rt.string; `case_id`: `string` = rt.string; `comment_id`: ``null`` \| `string`  } & { `payload`: {} ; `type`: ``"delete_case"``  } & { `action`: ``"add"`` \| ``"create"`` \| ``"delete"`` \| ``"update"`` \| ``"push_to_service"`` = ActionsRt; `created_at`: `string` = rt.string; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } = UserRT; `owner`: `string` = rt.string } & { `action_id`: `string` = rt.string; `case_id`: `string` = rt.string; `comment_id`: ``null`` \| `string`  }, `unknown`\>\>

#### Defined in

[x-pack/plugins/cases/server/services/user_actions/index.ts:310](https://github.com/elastic/kibana/blob/06b0f975f60/x-pack/plugins/cases/server/services/user_actions/index.ts#L310)

___

### getUniqueConnectors

▸ **getUniqueConnectors**(`__namedParameters`): `Promise`<{ `id`: `string`  }[]\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | `Object` |
| `__namedParameters.caseId` | `string` |
| `__namedParameters.filter?` | `KueryNode` |
| `__namedParameters.unsecuredSavedObjectsClient` | [`SavedObjectsClientContract`](../modules/client.__internalNamespace.md#savedobjectsclientcontract) |

#### Returns

`Promise`<{ `id`: `string`  }[]\>

#### Defined in

[x-pack/plugins/cases/server/services/user_actions/index.ts:426](https://github.com/elastic/kibana/blob/06b0f975f60/x-pack/plugins/cases/server/services/user_actions/index.ts#L426)

___

### getUserActionItemByDifference

▸ `Private` **getUserActionItemByDifference**(`__namedParameters`): [`BuilderReturnValue`](../interfaces/client.__internalNamespace.BuilderReturnValue.md)[]

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [`GetUserActionItemByDifference`](../interfaces/client.__internalNamespace.GetUserActionItemByDifference.md) |

#### Returns

[`BuilderReturnValue`](../interfaces/client.__internalNamespace.BuilderReturnValue.md)[]

#### Defined in

[x-pack/plugins/cases/server/services/user_actions/index.ts:108](https://github.com/elastic/kibana/blob/06b0f975f60/x-pack/plugins/cases/server/services/user_actions/index.ts#L108)
