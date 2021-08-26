[Cases Client API Interface](../cases_client_api.md) / [attachments/get](../modules/attachments_get.md) / GetAllArgs

# Interface: GetAllArgs

[attachments/get](../modules/attachments_get.md).GetAllArgs

Parameters for retrieving all attachments of a case

## Table of contents

### Properties

- [caseID](attachments_get.getallargs.md#caseid)
- [includeSubCaseComments](attachments_get.getallargs.md#includesubcasecomments)
- [subCaseID](attachments_get.getallargs.md#subcaseid)

## Properties

### caseID

• **caseID**: *string*

The case ID to retrieve all attachments for

Defined in: [attachments/get.ts:61](https://github.com/elastic/kibana/blob/a80791aa4cc/x-pack/plugins/cases/server/client/attachments/get.ts#L61)

___

### includeSubCaseComments

• `Optional` **includeSubCaseComments**: *boolean*

Optionally include the attachments associated with a sub case

Defined in: [attachments/get.ts:65](https://github.com/elastic/kibana/blob/a80791aa4cc/x-pack/plugins/cases/server/client/attachments/get.ts#L65)

___

### subCaseID

• `Optional` **subCaseID**: *string*

If included the case ID will be ignored and the attachments will be retrieved from the specified ID of the sub case

Defined in: [attachments/get.ts:69](https://github.com/elastic/kibana/blob/a80791aa4cc/x-pack/plugins/cases/server/client/attachments/get.ts#L69)
