[cases](../server_client_api.md) / [attachments/get](../modules/attachments_get.md) / GetAllArgs

# Interface: GetAllArgs

[attachments/get](../modules/attachments_get.md).GetAllArgs

## Table of contents

### Properties

- [caseID](attachments_get.getallargs.md#caseid)
- [includeSubCaseComments](attachments_get.getallargs.md#includesubcasecomments)
- [subCaseID](attachments_get.getallargs.md#subcaseid)

## Properties

### caseID

• **caseID**: *string*

The case ID to retrieve all attachments for

Defined in: [cases/server/client/attachments/get.ts:56](https://github.com/jonathan-buttner/kibana/blob/7a61a8b912c/x-pack/plugins/cases/server/client/attachments/get.ts#L56)

___

### includeSubCaseComments

• `Optional` **includeSubCaseComments**: *boolean*

Optionally include the attachments associated with a sub case

Defined in: [cases/server/client/attachments/get.ts:60](https://github.com/jonathan-buttner/kibana/blob/7a61a8b912c/x-pack/plugins/cases/server/client/attachments/get.ts#L60)

___

### subCaseID

• `Optional` **subCaseID**: *string*

If included the case ID will be ignored and the attachments will be retrieved from the specified ID of the sub case

Defined in: [cases/server/client/attachments/get.ts:64](https://github.com/jonathan-buttner/kibana/blob/7a61a8b912c/x-pack/plugins/cases/server/client/attachments/get.ts#L64)
