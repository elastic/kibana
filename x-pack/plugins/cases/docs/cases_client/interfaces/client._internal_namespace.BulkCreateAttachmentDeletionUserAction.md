[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_internal\_namespace](../modules/client._internal_namespace.md) / BulkCreateAttachmentDeletionUserAction

# Interface: BulkCreateAttachmentDeletionUserAction

[client](../modules/client.md).[_internal_namespace](../modules/client._internal_namespace.md).BulkCreateAttachmentDeletionUserAction

## Hierarchy

- `Omit`<[`CommonUserActionArgs`](../modules/client._internal_namespace.md#commonuseractionargs), ``"owner"``\>

  ↳ **`BulkCreateAttachmentDeletionUserAction`**

## Table of contents

### Properties

- [action](client._internal_namespace.BulkCreateAttachmentDeletionUserAction.md#action)
- [attachmentId](client._internal_namespace.BulkCreateAttachmentDeletionUserAction.md#attachmentid)
- [attachments](client._internal_namespace.BulkCreateAttachmentDeletionUserAction.md#attachments)
- [caseId](client._internal_namespace.BulkCreateAttachmentDeletionUserAction.md#caseid)
- [connectorId](client._internal_namespace.BulkCreateAttachmentDeletionUserAction.md#connectorid)
- [unsecuredSavedObjectsClient](client._internal_namespace.BulkCreateAttachmentDeletionUserAction.md#unsecuredsavedobjectsclient)
- [user](client._internal_namespace.BulkCreateAttachmentDeletionUserAction.md#user)

## Properties

### action

• `Optional` **action**: ``"add"`` \| ``"create"`` \| ``"delete"`` \| ``"update"`` \| ``"push_to_service"``

#### Inherited from

Omit.action

#### Defined in

[x-pack/plugins/cases/server/services/user_actions/types.ts:80](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/services/user_actions/types.ts#L80)

___

### attachmentId

• `Optional` **attachmentId**: `string`

#### Inherited from

Omit.attachmentId

#### Defined in

[x-pack/plugins/cases/server/services/user_actions/types.ts:78](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/services/user_actions/types.ts#L78)

___

### attachments

• **attachments**: { `attachment`: { `comment`: `string` = rt.string; `owner`: `string` = rt.string; `type`: [`user`](../modules/client._internal_namespace.md#user)  } \| { `alertId`: `string` \| `string`[] ; `index`: `string` \| `string`[] ; `owner`: `string` = rt.string; `rule`: { id: string \| null; name: string \| null; } ; `type`: [`alert`](../modules/client._internal_namespace.md#alert)  } \| { `actions`: { targets: { hostname: string; endpointId: string; }[]; type: string; } ; `comment`: `string` = rt.string; `owner`: `string` = rt.string; `type`: [`actions`](../modules/client._internal_namespace.md#actions)  } ; `id`: `string` ; `owner`: `string`  }[]

#### Defined in

[x-pack/plugins/cases/server/services/user_actions/index.ts:95](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/services/user_actions/index.ts#L95)

___

### caseId

• **caseId**: `string`

#### Inherited from

Omit.caseId

#### Defined in

[x-pack/plugins/cases/server/services/user_actions/types.ts:76](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/services/user_actions/types.ts#L76)

___

### connectorId

• `Optional` **connectorId**: `string`

#### Inherited from

Omit.connectorId

#### Defined in

[x-pack/plugins/cases/server/services/user_actions/types.ts:79](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/services/user_actions/types.ts#L79)

___

### unsecuredSavedObjectsClient

• **unsecuredSavedObjectsClient**: [`SavedObjectsClientContract`](../modules/client._internal_namespace.md#savedobjectsclientcontract)

#### Inherited from

Omit.unsecuredSavedObjectsClient

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

Omit.user

#### Defined in

[x-pack/plugins/cases/server/services/user_actions/types.ts:75](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/services/user_actions/types.ts#L75)
