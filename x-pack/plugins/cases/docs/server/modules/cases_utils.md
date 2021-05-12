[cases](../server_client_api.md) / cases/utils

# Module: cases/utils

## Table of contents

### Variables

- [transformers](cases_utils.md#transformers)

### Functions

- [FIELD\_INFORMATION](cases_utils.md#field_information)
- [createIncident](cases_utils.md#createincident)
- [getCommentContextFromAttributes](cases_utils.md#getcommentcontextfromattributes)
- [getEntity](cases_utils.md#getentity)
- [getLatestPushInfo](cases_utils.md#getlatestpushinfo)
- [isCommentAlertType](cases_utils.md#iscommentalerttype)
- [prepareFieldsForTransformation](cases_utils.md#preparefieldsfortransformation)
- [transformComments](cases_utils.md#transformcomments)
- [transformFields](cases_utils.md#transformfields)

## Variables

### transformers

• `Const` **transformers**: *Record*<string, [*Transformer*](cases_types.md#transformer)\>

Defined in: [cases/server/client/cases/utils.ts:235](https://github.com/jonathan-buttner/kibana/blob/7a61a8b912c/x-pack/plugins/cases/server/client/cases/utils.ts#L235)

## Functions

### FIELD\_INFORMATION

▸ `Const` **FIELD_INFORMATION**(`mode`: *string*, `date`: *undefined* \| *string*, `user`: *undefined* \| *string*): *string*

#### Parameters

| Name | Type |
| :------ | :------ |
| `mode` | *string* |
| `date` | *undefined* \| *string* |
| `user` | *undefined* \| *string* |

**Returns:** *string*

Defined in: [cases/server/client/cases/utils.ts:206](https://github.com/jonathan-buttner/kibana/blob/7a61a8b912c/x-pack/plugins/cases/server/client/cases/utils.ts#L206)

___

### createIncident

▸ `Const` **createIncident**(`__namedParameters`: CreateIncidentArgs): *Promise*<[*MapIncident*](../interfaces/cases_types.mapincident.md)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | CreateIncidentArgs |

**Returns:** *Promise*<[*MapIncident*](../interfaces/cases_types.mapincident.md)\>

Defined in: [cases/server/client/cases/utils.ts:95](https://github.com/jonathan-buttner/kibana/blob/7a61a8b912c/x-pack/plugins/cases/server/client/cases/utils.ts#L95)

___

### getCommentContextFromAttributes

▸ `Const` **getCommentContextFromAttributes**(`attributes`: { `comment`: *string* ; `owner`: *string* ; `type`: user  } & { `associationType`: AssociationType ; `created_at`: *string* ; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `owner`: *string* ; `pushed_at`: ``null`` \| *string* ; `pushed_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `updated_at`: ``null`` \| *string* ; `updated_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }  } \| { `alertId`: *string* \| *string*[] ; `index`: *string* \| *string*[] ; `owner`: *string* ; `rule`: { id: string \| null; name: string \| null; } ; `type`: alert \| generatedAlert  } & { `associationType`: AssociationType ; `created_at`: *string* ; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `owner`: *string* ; `pushed_at`: ``null`` \| *string* ; `pushed_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `updated_at`: ``null`` \| *string* ; `updated_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }  }): { `comment`: *string* ; `owner`: *string* ; `type`: user  } \| { `alertId`: *string* \| *string*[] ; `index`: *string* \| *string*[] ; `owner`: *string* ; `rule`: { id: string \| null; name: string \| null; } ; `type`: alert \| generatedAlert  }

#### Parameters

| Name | Type |
| :------ | :------ |
| `attributes` | { `comment`: *string* ; `owner`: *string* ; `type`: user  } & { `associationType`: AssociationType ; `created_at`: *string* ; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `owner`: *string* ; `pushed_at`: ``null`` \| *string* ; `pushed_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `updated_at`: ``null`` \| *string* ; `updated_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }  } \| { `alertId`: *string* \| *string*[] ; `index`: *string* \| *string*[] ; `owner`: *string* ; `rule`: { id: string \| null; name: string \| null; } ; `type`: alert \| generatedAlert  } & { `associationType`: AssociationType ; `created_at`: *string* ; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `owner`: *string* ; `pushed_at`: ``null`` \| *string* ; `pushed_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `updated_at`: ``null`` \| *string* ; `updated_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }  } |

**Returns:** { `comment`: *string* ; `owner`: *string* ; `type`: user  } \| { `alertId`: *string* \| *string*[] ; `index`: *string* \| *string*[] ; `owner`: *string* ; `rule`: { id: string \| null; name: string \| null; } ; `type`: alert \| generatedAlert  }

Defined in: [cases/server/client/cases/utils.ts:329](https://github.com/jonathan-buttner/kibana/blob/7a61a8b912c/x-pack/plugins/cases/server/client/cases/utils.ts#L329)

___

### getEntity

▸ `Const` **getEntity**(`entity`: [*EntityInformation*](../interfaces/cases_types.entityinformation.md)): *string*

#### Parameters

| Name | Type |
| :------ | :------ |
| `entity` | [*EntityInformation*](../interfaces/cases_types.entityinformation.md) |

**Returns:** *string*

Defined in: [cases/server/client/cases/utils.ts:195](https://github.com/jonathan-buttner/kibana/blob/7a61a8b912c/x-pack/plugins/cases/server/client/cases/utils.ts#L195)

___

### getLatestPushInfo

▸ `Const` **getLatestPushInfo**(`connectorId`: *string*, `userActions`: { `action`: ``"add"`` \| ``"create"`` \| ``"delete"`` \| ``"update"`` \| ``"push-to-service"`` ; `action_at`: *string* ; `action_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `action_field`: (``"comment"`` \| ``"owner"`` \| ``"status"`` \| ``"description"`` \| ``"tags"`` \| ``"title"`` \| ``"connector"`` \| ``"settings"`` \| ``"pushed"`` \| ``"sub_case"``)[] ; `new_value`: ``null`` \| *string* ; `old_value`: ``null`` \| *string* ; `owner`: *string*  } & { `action_id`: *string* ; `case_id`: *string* ; `comment_id`: ``null`` \| *string*  } & { `sub_case_id`: *undefined* \| *string*  }[]): ``null`` \| { `index`: *number* ; `pushedInfo`: ``null`` \| { `connector_id`: *string* ; `connector_name`: *string* ; `external_id`: *string* ; `external_title`: *string* ; `external_url`: *string*  } & { `pushed_at`: *string* ; `pushed_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }  }  }

#### Parameters

| Name | Type |
| :------ | :------ |
| `connectorId` | *string* |
| `userActions` | { `action`: ``"add"`` \| ``"create"`` \| ``"delete"`` \| ``"update"`` \| ``"push-to-service"`` ; `action_at`: *string* ; `action_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `action_field`: (``"comment"`` \| ``"owner"`` \| ``"status"`` \| ``"description"`` \| ``"tags"`` \| ``"title"`` \| ``"connector"`` \| ``"settings"`` \| ``"pushed"`` \| ``"sub_case"``)[] ; `new_value`: ``null`` \| *string* ; `old_value`: ``null`` \| *string* ; `owner`: *string*  } & { `action_id`: *string* ; `case_id`: *string* ; `comment_id`: ``null`` \| *string*  } & { `sub_case_id`: *undefined* \| *string*  }[] |

**Returns:** ``null`` \| { `index`: *number* ; `pushedInfo`: ``null`` \| { `connector_id`: *string* ; `connector_name`: *string* ; `external_id`: *string* ; `external_title`: *string* ; `external_url`: *string*  } & { `pushed_at`: *string* ; `pushed_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }  }  }

Defined in: [cases/server/client/cases/utils.ts:52](https://github.com/jonathan-buttner/kibana/blob/7a61a8b912c/x-pack/plugins/cases/server/client/cases/utils.ts#L52)

___

### isCommentAlertType

▸ `Const` **isCommentAlertType**(`comment`: { `comment`: *string* ; `owner`: *string* ; `type`: user  } & { `associationType`: AssociationType ; `created_at`: *string* ; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `owner`: *string* ; `pushed_at`: ``null`` \| *string* ; `pushed_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `updated_at`: ``null`` \| *string* ; `updated_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }  } & { `id`: *string* ; `version`: *string*  } & { `alertId`: *string* \| *string*[] ; `index`: *string* \| *string*[] ; `owner`: *string* ; `rule`: { id: string \| null; name: string \| null; } ; `type`: alert \| generatedAlert  } & { `associationType`: AssociationType ; `created_at`: *string* ; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `owner`: *string* ; `pushed_at`: ``null`` \| *string* ; `pushed_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `updated_at`: ``null`` \| *string* ; `updated_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }  } & { `id`: *string* ; `version`: *string*  }): comment is object & object & object

#### Parameters

| Name | Type |
| :------ | :------ |
| `comment` | { `comment`: *string* ; `owner`: *string* ; `type`: user  } & { `associationType`: AssociationType ; `created_at`: *string* ; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `owner`: *string* ; `pushed_at`: ``null`` \| *string* ; `pushed_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `updated_at`: ``null`` \| *string* ; `updated_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }  } & { `id`: *string* ; `version`: *string*  } & { `alertId`: *string* \| *string*[] ; `index`: *string* \| *string*[] ; `owner`: *string* ; `rule`: { id: string \| null; name: string \| null; } ; `type`: alert \| generatedAlert  } & { `associationType`: AssociationType ; `created_at`: *string* ; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `owner`: *string* ; `pushed_at`: ``null`` \| *string* ; `pushed_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `updated_at`: ``null`` \| *string* ; `updated_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }  } & { `id`: *string* ; `version`: *string*  } |

**Returns:** comment is object & object & object

Defined in: [cases/server/client/cases/utils.ts:325](https://github.com/jonathan-buttner/kibana/blob/7a61a8b912c/x-pack/plugins/cases/server/client/cases/utils.ts#L325)

___

### prepareFieldsForTransformation

▸ `Const` **prepareFieldsForTransformation**(`__namedParameters`: [*PrepareFieldsForTransformArgs*](../interfaces/cases_types.preparefieldsfortransformargs.md)): [*PipedField*](../interfaces/cases_types.pipedfield.md)[]

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [*PrepareFieldsForTransformArgs*](../interfaces/cases_types.preparefieldsfortransformargs.md) |

**Returns:** [*PipedField*](../interfaces/cases_types.pipedfield.md)[]

Defined in: [cases/server/client/cases/utils.ts:254](https://github.com/jonathan-buttner/kibana/blob/7a61a8b912c/x-pack/plugins/cases/server/client/cases/utils.ts#L254)

___

### transformComments

▸ `Const` **transformComments**(`comments?`: *undefined* \| { `comment`: *string* ; `owner`: *string* ; `type`: user  } & { `associationType`: AssociationType ; `created_at`: *string* ; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `owner`: *string* ; `pushed_at`: ``null`` \| *string* ; `pushed_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `updated_at`: ``null`` \| *string* ; `updated_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }  } & { `id`: *string* ; `version`: *string*  } & { `alertId`: *string* \| *string*[] ; `index`: *string* \| *string*[] ; `owner`: *string* ; `rule`: { id: string \| null; name: string \| null; } ; `type`: alert \| generatedAlert  } & { `associationType`: AssociationType ; `created_at`: *string* ; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `owner`: *string* ; `pushed_at`: ``null`` \| *string* ; `pushed_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `updated_at`: ``null`` \| *string* ; `updated_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }  } & { `id`: *string* ; `version`: *string*  }[], `pipes`: *string*[]): [*ExternalServiceComment*](../interfaces/cases_types.externalservicecomment.md)[]

#### Parameters

| Name | Type | Default value |
| :------ | :------ | :------ |
| `comments` | *undefined* \| { `comment`: *string* ; `owner`: *string* ; `type`: user  } & { `associationType`: AssociationType ; `created_at`: *string* ; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `owner`: *string* ; `pushed_at`: ``null`` \| *string* ; `pushed_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `updated_at`: ``null`` \| *string* ; `updated_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }  } & { `id`: *string* ; `version`: *string*  } & { `alertId`: *string* \| *string*[] ; `index`: *string* \| *string*[] ; `owner`: *string* ; `rule`: { id: string \| null; name: string \| null; } ; `type`: alert \| generatedAlert  } & { `associationType`: AssociationType ; `created_at`: *string* ; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `owner`: *string* ; `pushed_at`: ``null`` \| *string* ; `pushed_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `updated_at`: ``null`` \| *string* ; `updated_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }  } & { `id`: *string* ; `version`: *string*  }[] | [] |
| `pipes` | *string*[] | - |

**Returns:** [*ExternalServiceComment*](../interfaces/cases_types.externalservicecomment.md)[]

Defined in: [cases/server/client/cases/utils.ts:307](https://github.com/jonathan-buttner/kibana/blob/7a61a8b912c/x-pack/plugins/cases/server/client/cases/utils.ts#L307)

___

### transformFields

▸ `Const` **transformFields**<P, S, R\>(`__namedParameters`: [*TransformFieldsArgs*](../interfaces/cases_types.transformfieldsargs.md)<P, S\>): R

#### Type parameters

| Name | Type |
| :------ | :------ |
| `P` | [*EntityInformation*](../interfaces/cases_types.entityinformation.md) |
| `S` | *Record*<string, unknown\> |
| `R` | *object* |

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [*TransformFieldsArgs*](../interfaces/cases_types.transformfieldsargs.md)<P, S\> |

**Returns:** R

Defined in: [cases/server/client/cases/utils.ts:284](https://github.com/jonathan-buttner/kibana/blob/7a61a8b912c/x-pack/plugins/cases/server/client/cases/utils.ts#L284)
