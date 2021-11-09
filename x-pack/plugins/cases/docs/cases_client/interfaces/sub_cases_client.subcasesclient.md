[Cases Client API Interface](../cases_client_api.md) / [sub_cases/client](../modules/sub_cases_client.md) / SubCasesClient

# Interface: SubCasesClient

[sub_cases/client](../modules/sub_cases_client.md).SubCasesClient

The API routes for interacting with sub cases.

## Table of contents

### Methods

- [delete](sub_cases_client.subcasesclient.md#delete)
- [find](sub_cases_client.subcasesclient.md#find)
- [get](sub_cases_client.subcasesclient.md#get)
- [update](sub_cases_client.subcasesclient.md#update)

## Methods

### delete

▸ **delete**(`ids`: *string*[]): *Promise*<void\>

Deletes the specified entities and their attachments.

#### Parameters

| Name | Type |
| :------ | :------ |
| `ids` | *string*[] |

**Returns:** *Promise*<void\>

Defined in: [sub_cases/client.ts:68](https://github.com/elastic/kibana/blob/a80791aa4cc/x-pack/plugins/cases/server/client/sub_cases/client.ts#L68)

___

### find

▸ **find**(`findArgs`: FindArgs): *Promise*<[*ISubCasesFindResponse*](typedoc_interfaces.isubcasesfindresponse.md)\>

Retrieves the sub cases matching the search criteria.

#### Parameters

| Name | Type |
| :------ | :------ |
| `findArgs` | FindArgs |

**Returns:** *Promise*<[*ISubCasesFindResponse*](typedoc_interfaces.isubcasesfindresponse.md)\>

Defined in: [sub_cases/client.ts:72](https://github.com/elastic/kibana/blob/a80791aa4cc/x-pack/plugins/cases/server/client/sub_cases/client.ts#L72)

___

### get

▸ **get**(`getArgs`: GetArgs): *Promise*<[*ISubCaseResponse*](typedoc_interfaces.isubcaseresponse.md)\>

Retrieves a single sub case.

#### Parameters

| Name | Type |
| :------ | :------ |
| `getArgs` | GetArgs |

**Returns:** *Promise*<[*ISubCaseResponse*](typedoc_interfaces.isubcaseresponse.md)\>

Defined in: [sub_cases/client.ts:76](https://github.com/elastic/kibana/blob/a80791aa4cc/x-pack/plugins/cases/server/client/sub_cases/client.ts#L76)

___

### update

▸ **update**(`subCases`: { `subCases`: { `status`: *undefined* \| open \| *any*[*any*] \| closed  } & { id: string; version: string; }[]  }): *Promise*<[*ISubCasesResponse*](typedoc_interfaces.isubcasesresponse.md)\>

Updates the specified sub cases to the new values included in the request.

#### Parameters

| Name | Type |
| :------ | :------ |
| `subCases` | *object* |
| `subCases.subCases` | { `status`: *undefined* \| open \| *any*[*any*] \| closed  } & { id: string; version: string; }[] |

**Returns:** *Promise*<[*ISubCasesResponse*](typedoc_interfaces.isubcasesresponse.md)\>

Defined in: [sub_cases/client.ts:80](https://github.com/elastic/kibana/blob/a80791aa4cc/x-pack/plugins/cases/server/client/sub_cases/client.ts#L80)
