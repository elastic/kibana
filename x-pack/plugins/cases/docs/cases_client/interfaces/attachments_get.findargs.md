[Cases Client API Interface](../cases_client_api.md) / [attachments/get](../modules/attachments_get.md) / FindArgs

# Interface: FindArgs

[attachments/get](../modules/attachments_get.md).FindArgs

Parameters for finding attachments of a case

## Table of contents

### Properties

- [caseID](attachments_get.findargs.md#caseid)
- [queryParams](attachments_get.findargs.md#queryparams)

## Properties

### caseID

• **caseID**: *string*

The case ID for finding associated attachments

Defined in: [attachments/get.ts:47](https://github.com/elastic/kibana/blob/a80791aa4cc/x-pack/plugins/cases/server/client/attachments/get.ts#L47)

___

### queryParams

• `Optional` **queryParams**: *object*

Optional parameters for filtering the returned attachments

#### Type declaration

| Name | Type |
| :------ | :------ |
| `defaultSearchOperator` | *undefined* \| ``"AND"`` \| ``"OR"`` |
| `fields` | *undefined* \| *string*[] |
| `filter` | *undefined* \| *string* |
| `hasReference` | *undefined* \| { `id`: *string* ; `type`: *string*  } \| { `id`: *string* ; `type`: *string*  }[] |
| `hasReferenceOperator` | *undefined* \| ``"AND"`` \| ``"OR"`` |
| `page` | *undefined* \| *number* |
| `perPage` | *undefined* \| *number* |
| `search` | *undefined* \| *string* |
| `searchFields` | *undefined* \| *string*[] |
| `sortField` | *undefined* \| *string* |
| `sortOrder` | *undefined* \| ``"desc"`` \| ``"asc"`` |
| `subCaseId` | *undefined* \| *string* |

Defined in: [attachments/get.ts:51](https://github.com/elastic/kibana/blob/a80791aa4cc/x-pack/plugins/cases/server/client/attachments/get.ts#L51)
