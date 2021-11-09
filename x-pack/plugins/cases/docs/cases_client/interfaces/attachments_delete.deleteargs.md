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

Defined in: [attachments/delete.ts:49](https://github.com/elastic/kibana/blob/a80791aa4cc/x-pack/plugins/cases/server/client/attachments/delete.ts#L49)

___

### caseID

• **caseID**: *string*

The case ID to delete an attachment from

Defined in: [attachments/delete.ts:45](https://github.com/elastic/kibana/blob/a80791aa4cc/x-pack/plugins/cases/server/client/attachments/delete.ts#L45)

___

### subCaseID

• `Optional` **subCaseID**: *string*

If specified the caseID will be ignored and this value will be used to find a sub case for deleting the attachment

Defined in: [attachments/delete.ts:53](https://github.com/elastic/kibana/blob/a80791aa4cc/x-pack/plugins/cases/server/client/attachments/delete.ts#L53)
