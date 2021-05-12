[cases](../server_client_api.md) / attachments/get

# Module: attachments/get

## Table of contents

### Interfaces

- [FindArgs](../interfaces/attachments_get.findargs.md)
- [GetAllArgs](../interfaces/attachments_get.getallargs.md)
- [GetArgs](../interfaces/attachments_get.getargs.md)

### Functions

- [find](attachments_get.md#find)
- [get](attachments_get.md#get)
- [getAll](attachments_get.md#getall)

## Functions

### find

▸ **find**(`__namedParameters`: [*FindArgs*](../interfaces/attachments_get.findargs.md), `clientArgs`: CasesClientArgs): *Promise*<CommentsResponse\>

Retrieves the attachments for a case entity. This support pagination.

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [*FindArgs*](../interfaces/attachments_get.findargs.md) |
| `clientArgs` | CasesClientArgs |

**Returns:** *Promise*<CommentsResponse\>

Defined in: [cases/server/client/attachments/get.ts:81](https://github.com/jonathan-buttner/kibana/blob/7a61a8b912c/x-pack/plugins/cases/server/client/attachments/get.ts#L81)

___

### get

▸ **get**(`__namedParameters`: [*GetArgs*](../interfaces/attachments_get.getargs.md), `clientArgs`: CasesClientArgs): *Promise*<CommentResponse\>

Retrieves a single attachment by its ID.

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [*GetArgs*](../interfaces/attachments_get.getargs.md) |
| `clientArgs` | CasesClientArgs |

**Returns:** *Promise*<CommentResponse\>

Defined in: [cases/server/client/attachments/get.ts:171](https://github.com/jonathan-buttner/kibana/blob/7a61a8b912c/x-pack/plugins/cases/server/client/attachments/get.ts#L171)

___

### getAll

▸ **getAll**(`__namedParameters`: [*GetAllArgs*](../interfaces/attachments_get.getallargs.md), `clientArgs`: CasesClientArgs): *Promise*<any[]\>

Retrieves all the attachments for a case. The `includeSubCaseComments` can be used to include the sub case comments for
collections. If the entity is a sub case, pass in the subCaseID.

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [*GetAllArgs*](../interfaces/attachments_get.getallargs.md) |
| `clientArgs` | CasesClientArgs |

**Returns:** *Promise*<any[]\>

Defined in: [cases/server/client/attachments/get.ts:211](https://github.com/jonathan-buttner/kibana/blob/7a61a8b912c/x-pack/plugins/cases/server/client/attachments/get.ts#L211)
