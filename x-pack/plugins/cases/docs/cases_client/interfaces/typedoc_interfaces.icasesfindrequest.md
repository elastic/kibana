[Cases Client API Interface](../README.md) / [typedoc\_interfaces](../modules/typedoc_interfaces.md) / ICasesFindRequest

# Interface: ICasesFindRequest

[typedoc_interfaces](../modules/typedoc_interfaces.md).ICasesFindRequest

## Hierarchy

- [`CasesFindRequest`](../modules/client._internal_namespace.md#casesfindrequest)

  ↳ **`ICasesFindRequest`**

## Table of contents

### Properties

- [defaultSearchOperator](typedoc_interfaces.ICasesFindRequest.md#defaultsearchoperator)
- [fields](typedoc_interfaces.ICasesFindRequest.md#fields)
- [owner](typedoc_interfaces.ICasesFindRequest.md#owner)
- [page](typedoc_interfaces.ICasesFindRequest.md#page)
- [perPage](typedoc_interfaces.ICasesFindRequest.md#perpage)
- [reporters](typedoc_interfaces.ICasesFindRequest.md#reporters)
- [search](typedoc_interfaces.ICasesFindRequest.md#search)
- [searchFields](typedoc_interfaces.ICasesFindRequest.md#searchfields)
- [sortField](typedoc_interfaces.ICasesFindRequest.md#sortfield)
- [sortOrder](typedoc_interfaces.ICasesFindRequest.md#sortorder)
- [status](typedoc_interfaces.ICasesFindRequest.md#status)
- [tags](typedoc_interfaces.ICasesFindRequest.md#tags)

## Properties

### defaultSearchOperator

• **defaultSearchOperator**: `undefined` \| ``"AND"`` \| ``"OR"``

#### Inherited from

CasesFindRequest.defaultSearchOperator

___

### fields

• **fields**: `undefined` \| `string`[]

#### Inherited from

CasesFindRequest.fields

___

### owner

• **owner**: `undefined` \| `string` \| `string`[]

#### Inherited from

CasesFindRequest.owner

___

### page

• **page**: `undefined` \| `number` = `NumberFromString`

#### Inherited from

CasesFindRequest.page

___

### perPage

• **perPage**: `undefined` \| `number` = `NumberFromString`

#### Inherited from

CasesFindRequest.perPage

___

### reporters

• **reporters**: `undefined` \| `string` \| `string`[]

#### Inherited from

CasesFindRequest.reporters

___

### search

• **search**: `undefined` \| `string` = `rt.string`

#### Inherited from

CasesFindRequest.search

___

### searchFields

• **searchFields**: `undefined` \| `string` \| `string`[]

#### Inherited from

CasesFindRequest.searchFields

___

### sortField

• **sortField**: `undefined` \| `string` = `rt.string`

#### Inherited from

CasesFindRequest.sortField

___

### sortOrder

• **sortOrder**: `undefined` \| ``"desc"`` \| ``"asc"``

#### Inherited from

CasesFindRequest.sortOrder

___

### status

• **status**: `undefined` \| [`open`](../enums/client._internal_namespace.CaseStatuses.md#open) \| `any`[`any`] \| [`closed`](../enums/client._internal_namespace.CaseStatuses.md#closed) = `CaseStatusRt`

#### Inherited from

CasesFindRequest.status

___

### tags

• **tags**: `undefined` \| `string` \| `string`[]

#### Inherited from

CasesFindRequest.tags
