[Cases Client API Interface](../README.md) / [attachments/client](../modules/attachments_client.md) / [\_internal\_namespace](../modules/attachments_client._internal_namespace.md) / FindArgs

# Interface: FindArgs

[attachments/client](../modules/attachments_client.md).[_internal_namespace](../modules/attachments_client._internal_namespace.md).FindArgs

Parameters for finding attachments of a case

## Table of contents

### Properties

- [caseID](attachments_client._internal_namespace.FindArgs.md#caseid)
- [queryParams](attachments_client._internal_namespace.FindArgs.md#queryparams)

## Properties

### caseID

• **caseID**: `string`

The case ID for finding associated attachments

#### Defined in

[x-pack/plugins/cases/server/client/attachments/get.ts:42](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/client/attachments/get.ts#L42)

___

### queryParams

• `Optional` **queryParams**: `Object`

Optional parameters for filtering the returned attachments

#### Type declaration

| Name | Type |
| :------ | :------ |
| `defaultSearchOperator` | `undefined` \| ``"AND"`` \| ``"OR"`` |
| `fields` | `undefined` \| `string`[] |
| `filter` | `undefined` \| `string` |
| `hasReference` | `undefined` \| { `id`: `string` = rt.string; `type`: `string` = rt.string } \| { `id`: `string` = rt.string; `type`: `string` = rt.string }[] |
| `hasReferenceOperator` | `undefined` \| ``"AND"`` \| ``"OR"`` |
| `page` | `undefined` \| `number` |
| `perPage` | `undefined` \| `number` |
| `search` | `undefined` \| `string` |
| `searchFields` | `undefined` \| `string`[] |
| `sortField` | `undefined` \| `string` |
| `sortOrder` | `undefined` \| ``"desc"`` \| ``"asc"`` |

#### Defined in

[x-pack/plugins/cases/server/client/attachments/get.ts:46](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/client/attachments/get.ts#L46)
