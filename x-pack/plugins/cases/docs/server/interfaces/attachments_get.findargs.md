[cases](../server_client_api.md) / [attachments/get](../modules/attachments_get.md) / FindArgs

# Interface: FindArgs

[attachments/get](../modules/attachments_get.md).FindArgs

## Table of contents

### Properties

- [caseID](attachments_get.findargs.md#caseid)
- [queryParams](attachments_get.findargs.md#queryparams)

## Properties

### caseID

• **caseID**: *string*

The case ID for finding associated attachments

Defined in: [cases/server/client/attachments/get.ts:45](https://github.com/jonathan-buttner/kibana/blob/7a61a8b912c/x-pack/plugins/cases/server/client/attachments/get.ts#L45)

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

Defined in: [cases/server/client/attachments/get.ts:49](https://github.com/jonathan-buttner/kibana/blob/7a61a8b912c/x-pack/plugins/cases/server/client/attachments/get.ts#L49)
