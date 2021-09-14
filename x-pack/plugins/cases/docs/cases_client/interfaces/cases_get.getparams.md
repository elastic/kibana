[Cases Client API Interface](../cases_client_api.md) / [cases/get](../modules/cases_get.md) / GetParams

# Interface: GetParams

[cases/get](../modules/cases_get.md).GetParams

The parameters for retrieving a case

## Table of contents

### Properties

- [id](cases_get.getparams.md#id)
- [includeComments](cases_get.getparams.md#includecomments)
- [includeSubCaseComments](cases_get.getparams.md#includesubcasecomments)

## Properties

### id

• **id**: *string*

Case ID

Defined in: [cases/get.ts:145](https://github.com/elastic/kibana/blob/a80791aa4cc/x-pack/plugins/cases/server/client/cases/get.ts#L145)

___

### includeComments

• `Optional` **includeComments**: *boolean*

Whether to include the attachments for a case in the response

Defined in: [cases/get.ts:149](https://github.com/elastic/kibana/blob/a80791aa4cc/x-pack/plugins/cases/server/client/cases/get.ts#L149)

___

### includeSubCaseComments

• `Optional` **includeSubCaseComments**: *boolean*

Whether to include the attachments for all children of a case in the response

Defined in: [cases/get.ts:153](https://github.com/elastic/kibana/blob/a80791aa4cc/x-pack/plugins/cases/server/client/cases/get.ts#L153)
