[Cases Client API Interface](../cases_client_api.md) / [attachments/delete](../modules/attachments_delete.md) / DeleteAllArgs

# Interface: DeleteAllArgs

[attachments/delete](../modules/attachments_delete.md).DeleteAllArgs

Parameters for deleting all comments of a case or sub case.

## Table of contents

### Properties

- [caseID](attachments_delete.deleteallargs.md#caseid)
- [subCaseID](attachments_delete.deleteallargs.md#subcaseid)

## Properties

### caseID

• **caseID**: *string*

The case ID to delete all attachments for

Defined in: [attachments/delete.ts:31](https://github.com/elastic/kibana/blob/a80791aa4cc/x-pack/plugins/cases/server/client/attachments/delete.ts#L31)

___

### subCaseID

• `Optional` **subCaseID**: *string*

If specified the caseID will be ignored and this value will be used to find a sub case for deleting all the attachments

Defined in: [attachments/delete.ts:35](https://github.com/elastic/kibana/blob/a80791aa4cc/x-pack/plugins/cases/server/client/attachments/delete.ts#L35)
