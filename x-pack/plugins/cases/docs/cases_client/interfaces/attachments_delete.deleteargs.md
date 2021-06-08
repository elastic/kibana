[Cases Client API Interface](../cases_client_api.md) / [attachments/delete](../modules/attachments_delete.md) / DeleteArgs

# Interface: DeleteArgs

[attachments/delete](../modules/attachments_delete.md).DeleteArgs

Parameters for deleting a single attachment of a case or sub case.

## Table of contents

### Properties

- [attachmentID](attachments_delete.deleteargs.md#attachmentid)
- [caseID](attachments_delete.deleteargs.md#caseid)
- [subCaseID](attachments_delete.deleteargs.md#subcaseid)

## Properties

### attachmentID

• **attachmentID**: *string*

The attachment ID to delete

Defined in: [attachments/delete.ts:44](https://github.com/jonathan-buttner/kibana/blob/2085a3b4480/x-pack/plugins/cases/server/client/attachments/delete.ts#L44)

___

### caseID

• **caseID**: *string*

The case ID to delete an attachment from

Defined in: [attachments/delete.ts:40](https://github.com/jonathan-buttner/kibana/blob/2085a3b4480/x-pack/plugins/cases/server/client/attachments/delete.ts#L40)

___

### subCaseID

• `Optional` **subCaseID**: *string*

If specified the caseID will be ignored and this value will be used to find a sub case for deleting the attachment

Defined in: [attachments/delete.ts:48](https://github.com/jonathan-buttner/kibana/blob/2085a3b4480/x-pack/plugins/cases/server/client/attachments/delete.ts#L48)
