[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_internal\_namespace](../modules/client._internal_namespace.md) / UserActionBuilder

# Class: UserActionBuilder

[client](../modules/client.md).[_internal_namespace](../modules/client._internal_namespace.md).UserActionBuilder

## Table of contents

### Constructors

- [constructor](client._internal_namespace.UserActionBuilder.md#constructor)

### Methods

- [build](client._internal_namespace.UserActionBuilder.md#build)
- [buildCommonUserAction](client._internal_namespace.UserActionBuilder.md#buildcommonuseraction)
- [createActionReference](client._internal_namespace.UserActionBuilder.md#createactionreference)
- [createCaseReferences](client._internal_namespace.UserActionBuilder.md#createcasereferences)
- [createCommentReferences](client._internal_namespace.UserActionBuilder.md#createcommentreferences)
- [createConnectorPushReference](client._internal_namespace.UserActionBuilder.md#createconnectorpushreference)
- [createConnectorReference](client._internal_namespace.UserActionBuilder.md#createconnectorreference)
- [extractConnectorId](client._internal_namespace.UserActionBuilder.md#extractconnectorid)
- [extractConnectorIdFromExternalService](client._internal_namespace.UserActionBuilder.md#extractconnectoridfromexternalservice)
- [getCommonUserActionAttributes](client._internal_namespace.UserActionBuilder.md#getcommonuseractionattributes)

## Constructors

### constructor

• **new UserActionBuilder**()

## Methods

### build

▸ `Abstract` **build**<`T`\>(`args`): [`BuilderReturnValue`](../interfaces/client._internal_namespace.BuilderReturnValue.md)

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | extends keyof [`BuilderParameters`](../interfaces/client._internal_namespace.BuilderParameters.md) |

#### Parameters

| Name | Type |
| :------ | :------ |
| `args` | [`UserActionParameters`](../modules/client._internal_namespace.md#useractionparameters)<`T`\> |

#### Returns

[`BuilderReturnValue`](../interfaces/client._internal_namespace.BuilderReturnValue.md)

#### Defined in

[x-pack/plugins/cases/server/services/user_actions/abstract_builder.ts:119](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/services/user_actions/abstract_builder.ts#L119)

___

### buildCommonUserAction

▸ `Protected` **buildCommonUserAction**(`__namedParameters`): [`BuilderReturnValue`](../interfaces/client._internal_namespace.BuilderReturnValue.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [`CommonBuilderArguments`](../modules/client._internal_namespace.md#commonbuilderarguments) |

#### Returns

[`BuilderReturnValue`](../interfaces/client._internal_namespace.BuilderReturnValue.md)

#### Defined in

[x-pack/plugins/cases/server/services/user_actions/abstract_builder.ts:88](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/services/user_actions/abstract_builder.ts#L88)

___

### createActionReference

▸ `Protected` **createActionReference**(`id`, `name`): [`SavedObjectReference`](../interfaces/client._internal_namespace.SavedObjectReference.md)[]

#### Parameters

| Name | Type |
| :------ | :------ |
| `id` | ``null`` \| `string` |
| `name` | `string` |

#### Returns

[`SavedObjectReference`](../interfaces/client._internal_namespace.SavedObjectReference.md)[]

#### Defined in

[x-pack/plugins/cases/server/services/user_actions/abstract_builder.ts:55](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/services/user_actions/abstract_builder.ts#L55)

___

### createCaseReferences

▸ `Protected` **createCaseReferences**(`caseId`): [`SavedObjectReference`](../interfaces/client._internal_namespace.SavedObjectReference.md)[]

#### Parameters

| Name | Type |
| :------ | :------ |
| `caseId` | `string` |

#### Returns

[`SavedObjectReference`](../interfaces/client._internal_namespace.SavedObjectReference.md)[]

#### Defined in

[x-pack/plugins/cases/server/services/user_actions/abstract_builder.ts:45](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/services/user_actions/abstract_builder.ts#L45)

___

### createCommentReferences

▸ `Protected` **createCommentReferences**(`id`): [`SavedObjectReference`](../interfaces/client._internal_namespace.SavedObjectReference.md)[]

#### Parameters

| Name | Type |
| :------ | :------ |
| `id` | ``null`` \| `string` |

#### Returns

[`SavedObjectReference`](../interfaces/client._internal_namespace.SavedObjectReference.md)[]

#### Defined in

[x-pack/plugins/cases/server/services/user_actions/abstract_builder.ts:61](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/services/user_actions/abstract_builder.ts#L61)

___

### createConnectorPushReference

▸ `Protected` **createConnectorPushReference**(`id`): [`SavedObjectReference`](../interfaces/client._internal_namespace.SavedObjectReference.md)[]

#### Parameters

| Name | Type |
| :------ | :------ |
| `id` | ``null`` \| `string` |

#### Returns

[`SavedObjectReference`](../interfaces/client._internal_namespace.SavedObjectReference.md)[]

#### Defined in

[x-pack/plugins/cases/server/services/user_actions/abstract_builder.ts:77](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/services/user_actions/abstract_builder.ts#L77)

___

### createConnectorReference

▸ `Protected` **createConnectorReference**(`id`): [`SavedObjectReference`](../interfaces/client._internal_namespace.SavedObjectReference.md)[]

#### Parameters

| Name | Type |
| :------ | :------ |
| `id` | ``null`` \| `string` |

#### Returns

[`SavedObjectReference`](../interfaces/client._internal_namespace.SavedObjectReference.md)[]

#### Defined in

[x-pack/plugins/cases/server/services/user_actions/abstract_builder.ts:73](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/services/user_actions/abstract_builder.ts#L73)

___

### extractConnectorId

▸ `Protected` **extractConnectorId**(`connector`): `Omit`<{ `id`: `string` = rt.string } & { `fields`: ``null`` \| { issueType: string \| null; priority: string \| null; parent: string \| null; } ; `type`: [`jira`](../modules/client._internal_namespace.md#jira)  } & { `name`: `string` = rt.string } & { `id`: `string` = rt.string } & { `fields`: ``null`` = rt.null; `type`: [`none`](../modules/client._internal_namespace.md#none)  } & { `name`: `string` = rt.string } & { `id`: `string` = rt.string } & { `fields`: ``null`` \| { incidentTypes: string[] \| null; severityCode: string \| null; } ; `type`: [`resilient`](../modules/client._internal_namespace.md#resilient)  } & { `name`: `string` = rt.string } & { `id`: `string` = rt.string } & { `fields`: ``null`` \| { impact: string \| null; severity: string \| null; urgency: string \| null; category: string \| null; subcategory: string \| null; } ; `type`: [`serviceNowITSM`](../modules/client._internal_namespace.md#servicenowitsm)  } & { `name`: `string` = rt.string } & { `id`: `string` = rt.string } & { `fields`: ``null`` \| { category: string \| null; destIp: boolean \| null; malwareHash: boolean \| null; malwareUrl: boolean \| null; priority: string \| null; sourceIp: boolean \| null; subcategory: string \| null; } ; `type`: [`serviceNowSIR`](../modules/client._internal_namespace.md#servicenowsir)  } & { `name`: `string` = rt.string } & { `id`: `string` = rt.string } & { `fields`: ``null`` \| { caseId: string \| null; } ; `type`: [`swimlane`](../modules/client._internal_namespace.md#swimlane)  } & { `name`: `string` = rt.string }, ``"id"``\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `connector` | { `id`: `string` = rt.string } & { `fields`: ``null`` \| { issueType: string \| null; priority: string \| null; parent: string \| null; } ; `type`: [`jira`](../modules/client._internal_namespace.md#jira)  } & { `name`: `string` = rt.string } & { `id`: `string` = rt.string } & { `fields`: ``null`` = rt.null; `type`: [`none`](../modules/client._internal_namespace.md#none)  } & { `name`: `string` = rt.string } & { `id`: `string` = rt.string } & { `fields`: ``null`` \| { incidentTypes: string[] \| null; severityCode: string \| null; } ; `type`: [`resilient`](../modules/client._internal_namespace.md#resilient)  } & { `name`: `string` = rt.string } & { `id`: `string` = rt.string } & { `fields`: ``null`` \| { impact: string \| null; severity: string \| null; urgency: string \| null; category: string \| null; subcategory: string \| null; } ; `type`: [`serviceNowITSM`](../modules/client._internal_namespace.md#servicenowitsm)  } & { `name`: `string` = rt.string } & { `id`: `string` = rt.string } & { `fields`: ``null`` \| { category: string \| null; destIp: boolean \| null; malwareHash: boolean \| null; malwareUrl: boolean \| null; priority: string \| null; sourceIp: boolean \| null; subcategory: string \| null; } ; `type`: [`serviceNowSIR`](../modules/client._internal_namespace.md#servicenowsir)  } & { `name`: `string` = rt.string } & { `id`: `string` = rt.string } & { `fields`: ``null`` \| { caseId: string \| null; } ; `type`: [`swimlane`](../modules/client._internal_namespace.md#swimlane)  } & { `name`: `string` = rt.string } |

#### Returns

`Omit`<{ `id`: `string` = rt.string } & { `fields`: ``null`` \| { issueType: string \| null; priority: string \| null; parent: string \| null; } ; `type`: [`jira`](../modules/client._internal_namespace.md#jira)  } & { `name`: `string` = rt.string } & { `id`: `string` = rt.string } & { `fields`: ``null`` = rt.null; `type`: [`none`](../modules/client._internal_namespace.md#none)  } & { `name`: `string` = rt.string } & { `id`: `string` = rt.string } & { `fields`: ``null`` \| { incidentTypes: string[] \| null; severityCode: string \| null; } ; `type`: [`resilient`](../modules/client._internal_namespace.md#resilient)  } & { `name`: `string` = rt.string } & { `id`: `string` = rt.string } & { `fields`: ``null`` \| { impact: string \| null; severity: string \| null; urgency: string \| null; category: string \| null; subcategory: string \| null; } ; `type`: [`serviceNowITSM`](../modules/client._internal_namespace.md#servicenowitsm)  } & { `name`: `string` = rt.string } & { `id`: `string` = rt.string } & { `fields`: ``null`` \| { category: string \| null; destIp: boolean \| null; malwareHash: boolean \| null; malwareUrl: boolean \| null; priority: string \| null; sourceIp: boolean \| null; subcategory: string \| null; } ; `type`: [`serviceNowSIR`](../modules/client._internal_namespace.md#servicenowsir)  } & { `name`: `string` = rt.string } & { `id`: `string` = rt.string } & { `fields`: ``null`` \| { caseId: string \| null; } ; `type`: [`swimlane`](../modules/client._internal_namespace.md#swimlane)  } & { `name`: `string` = rt.string }, ``"id"``\>

#### Defined in

[x-pack/plugins/cases/server/services/user_actions/abstract_builder.ts:40](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/services/user_actions/abstract_builder.ts#L40)

___

### extractConnectorIdFromExternalService

▸ `Protected` **extractConnectorIdFromExternalService**(`externalService`): `Omit`<{ `connector_id`: `string` = rt.string } & { `connector_name`: `string` = rt.string; `external_id`: `string` = rt.string; `external_title`: `string` = rt.string; `external_url`: `string` = rt.string; `pushed_at`: `string` = rt.string; `pushed_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } = UserRT }, ``"connector_id"``\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `externalService` | { `connector_id`: `string` = rt.string } & { `connector_name`: `string` = rt.string; `external_id`: `string` = rt.string; `external_title`: `string` = rt.string; `external_url`: `string` = rt.string; `pushed_at`: `string` = rt.string; `pushed_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } = UserRT } |

#### Returns

`Omit`<{ `connector_id`: `string` = rt.string } & { `connector_name`: `string` = rt.string; `external_id`: `string` = rt.string; `external_title`: `string` = rt.string; `external_url`: `string` = rt.string; `pushed_at`: `string` = rt.string; `pushed_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } = UserRT }, ``"connector_id"``\>

#### Defined in

[x-pack/plugins/cases/server/services/user_actions/abstract_builder.ts:81](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/services/user_actions/abstract_builder.ts#L81)

___

### getCommonUserActionAttributes

▸ `Protected` **getCommonUserActionAttributes**(`__namedParameters`): `Object`

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | `Object` |
| `__namedParameters.owner` | `string` |
| `__namedParameters.user` | `Object` |
| `__namedParameters.user.email` | `undefined` \| ``null`` \| `string` |
| `__namedParameters.user.full_name` | `undefined` \| ``null`` \| `string` |
| `__namedParameters.user.username` | `undefined` \| ``null`` \| `string` |

#### Returns

`Object`

| Name | Type |
| :------ | :------ |
| `created_at` | `string` |
| `created_by` | `Object` |
| `created_by.email` | `undefined` \| ``null`` \| `string` |
| `created_by.full_name` | `undefined` \| ``null`` \| `string` |
| `created_by.username` | `undefined` \| ``null`` \| `string` |
| `owner` | `string` |

#### Defined in

[x-pack/plugins/cases/server/services/user_actions/abstract_builder.ts:32](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/services/user_actions/abstract_builder.ts#L32)
