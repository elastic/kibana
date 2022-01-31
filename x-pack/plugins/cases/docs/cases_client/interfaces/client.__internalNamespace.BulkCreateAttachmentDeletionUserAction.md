[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_\_internalNamespace](../modules/client.__internalNamespace.md) / BulkCreateAttachmentDeletionUserAction

# Interface: BulkCreateAttachmentDeletionUserAction

[client](../modules/client.md).[__internalNamespace](../modules/client.__internalNamespace.md).BulkCreateAttachmentDeletionUserAction

## Hierarchy

- `Omit`<[`CommonUserActionArgs`](../modules/client.__internalNamespace.md#commonuseractionargs), ``"owner"``\>

  ↳ **`BulkCreateAttachmentDeletionUserAction`**

## Table of contents

### Properties

- [action](client.__internalNamespace.BulkCreateAttachmentDeletionUserAction.md#action)
- [attachmentId](client.__internalNamespace.BulkCreateAttachmentDeletionUserAction.md#attachmentid)
- [attachments](client.__internalNamespace.BulkCreateAttachmentDeletionUserAction.md#attachments)
- [caseId](client.__internalNamespace.BulkCreateAttachmentDeletionUserAction.md#caseid)
- [connectorId](client.__internalNamespace.BulkCreateAttachmentDeletionUserAction.md#connectorid)
- [unsecuredSavedObjectsClient](client.__internalNamespace.BulkCreateAttachmentDeletionUserAction.md#unsecuredsavedobjectsclient)
- [user](client.__internalNamespace.BulkCreateAttachmentDeletionUserAction.md#user)

## Properties

### action

• `Optional` **action**: ``"add"`` \| ``"create"`` \| ``"delete"`` \| ``"update"`` \| ``"push_to_service"``

#### Inherited from

Omit.action

#### Defined in

[x-pack/plugins/cases/server/services/user_actions/types.ts:80](https://github.com/elastic/kibana/blob/06b0f975f60/x-pack/plugins/cases/server/services/user_actions/types.ts#L80)

___

### attachmentId

• `Optional` **attachmentId**: `string`

#### Inherited from

Omit.attachmentId

#### Defined in

[x-pack/plugins/cases/server/services/user_actions/types.ts:78](https://github.com/elastic/kibana/blob/06b0f975f60/x-pack/plugins/cases/server/services/user_actions/types.ts#L78)

___

### attachments

• **attachments**: { `attachment`: { `comment`: `string` = rt.string; `owner`: `string` = rt.string; `type`: [`user`](../modules/client.__internalNamespace.md#user)  } \| { `alertId`: `string` \| `string`[] ; `index`: `string` \| `string`[] ; `owner`: `string` = rt.string; `rule`: { id: string \| null; name: string \| null; } ; `type`: [`alert`](../modules/client.__internalNamespace.md#alert)  } \| { `actions`: { targets: { hostname: string; endpointId: string; }[]; type: string; } ; `comment`: `string` = rt.string; `owner`: `string` = rt.string; `type`: [`actions`](../modules/client.__internalNamespace.md#actions)  } ; `id`: `string` ; `owner`: `string`  }[]

#### Defined in

[x-pack/plugins/cases/server/services/user_actions/index.ts:95](https://github.com/elastic/kibana/blob/06b0f975f60/x-pack/plugins/cases/server/services/user_actions/index.ts#L95)

___

### caseId

• **caseId**: `string`

#### Inherited from

Omit.caseId

#### Defined in

[x-pack/plugins/cases/server/services/user_actions/types.ts:76](https://github.com/elastic/kibana/blob/06b0f975f60/x-pack/plugins/cases/server/services/user_actions/types.ts#L76)

___

### connectorId

• `Optional` **connectorId**: `string`

#### Inherited from

Omit.connectorId

#### Defined in

[x-pack/plugins/cases/server/services/user_actions/types.ts:79](https://github.com/elastic/kibana/blob/06b0f975f60/x-pack/plugins/cases/server/services/user_actions/types.ts#L79)

___

### unsecuredSavedObjectsClient

• **unsecuredSavedObjectsClient**: [`SavedObjectsClientContract`](../modules/client.__internalNamespace.md#savedobjectsclientcontract)

#### Inherited from

Omit.unsecuredSavedObjectsClient

#### Defined in

[x-pack/plugins/cases/server/services/index.ts:19](https://github.com/elastic/kibana/blob/06b0f975f60/x-pack/plugins/cases/server/services/index.ts#L19)

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

[x-pack/plugins/cases/server/services/user_actions/types.ts:75](https://github.com/elastic/kibana/blob/06b0f975f60/x-pack/plugins/cases/server/services/user_actions/types.ts#L75)
