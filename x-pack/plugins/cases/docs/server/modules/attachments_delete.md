[cases](../server_client_api.md) / attachments/delete

# Module: attachments/delete

## Table of contents

### Interfaces

- [DeleteAllArgs](../interfaces/attachments_delete.deleteallargs.md)
- [DeleteArgs](../interfaces/attachments_delete.deleteargs.md)

### Functions

- [deleteAll](attachments_delete.md#deleteall)
- [deleteComment](attachments_delete.md#deletecomment)

## Functions

### deleteAll

▸ **deleteAll**(`__namedParameters`: [*DeleteAllArgs*](../interfaces/attachments_delete.deleteallargs.md), `clientArgs`: CasesClientArgs): *Promise*<void\>

Delete all comments for a case or sub case.

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [*DeleteAllArgs*](../interfaces/attachments_delete.deleteallargs.md) |
| `clientArgs` | CasesClientArgs |

**Returns:** *Promise*<void\>

Defined in: [cases/server/client/attachments/delete.ts:54](https://github.com/jonathan-buttner/kibana/blob/7a61a8b912c/x-pack/plugins/cases/server/client/attachments/delete.ts#L54)

___

### deleteComment

▸ **deleteComment**(`__namedParameters`: [*DeleteArgs*](../interfaces/attachments_delete.deleteargs.md), `clientArgs`: CasesClientArgs): *Promise*<void\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [*DeleteArgs*](../interfaces/attachments_delete.deleteargs.md) |
| `clientArgs` | CasesClientArgs |

**Returns:** *Promise*<void\>

Defined in: [cases/server/client/attachments/delete.ts:126](https://github.com/jonathan-buttner/kibana/blob/7a61a8b912c/x-pack/plugins/cases/server/client/attachments/delete.ts#L126)
