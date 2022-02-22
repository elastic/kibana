[Cases Client API Interface](../README.md) / [typedoc\_interfaces](../modules/typedoc_interfaces.md) / ICasesConfigureResponse

# Interface: ICasesConfigureResponse

[typedoc_interfaces](../modules/typedoc_interfaces.md).ICasesConfigureResponse

## Hierarchy

- [`CasesConfigureResponse`](../modules/typedoc_interfaces._internal_namespace.md#casesconfigureresponse)

  ↳ **`ICasesConfigureResponse`**

## Table of contents

### Properties

- [closure\_type](typedoc_interfaces.ICasesConfigureResponse.md#closure_type)
- [connector](typedoc_interfaces.ICasesConfigureResponse.md#connector)
- [created\_at](typedoc_interfaces.ICasesConfigureResponse.md#created_at)
- [created\_by](typedoc_interfaces.ICasesConfigureResponse.md#created_by)
- [error](typedoc_interfaces.ICasesConfigureResponse.md#error)
- [id](typedoc_interfaces.ICasesConfigureResponse.md#id)
- [mappings](typedoc_interfaces.ICasesConfigureResponse.md#mappings)
- [owner](typedoc_interfaces.ICasesConfigureResponse.md#owner)
- [updated\_at](typedoc_interfaces.ICasesConfigureResponse.md#updated_at)
- [updated\_by](typedoc_interfaces.ICasesConfigureResponse.md#updated_by)
- [version](typedoc_interfaces.ICasesConfigureResponse.md#version)

## Properties

### closure\_type

• **closure\_type**: ``"close-by-user"`` \| ``"close-by-pushing"`` = `ClosureTypeRT`

#### Inherited from

CasesConfigureResponse.closure\_type

___

### connector

• **connector**: { `id`: `string` = rt.string } & { `fields`: ``null`` \| { issueType: string \| null; priority: string \| null; parent: string \| null; } ; `type`: [`jira`](../modules/client._internal_namespace.md#jira)  } & { `name`: `string` = rt.string } & { `id`: `string` = rt.string } & { `fields`: ``null`` = rt.null; `type`: [`none`](../modules/client._internal_namespace.md#none)  } & { `name`: `string` = rt.string } & { `id`: `string` = rt.string } & { `fields`: ``null`` \| { incidentTypes: string[] \| null; severityCode: string \| null; } ; `type`: [`resilient`](../modules/client._internal_namespace.md#resilient)  } & { `name`: `string` = rt.string } & { `id`: `string` = rt.string } & { `fields`: ``null`` \| { impact: string \| null; severity: string \| null; urgency: string \| null; category: string \| null; subcategory: string \| null; } ; `type`: [`serviceNowITSM`](../modules/client._internal_namespace.md#servicenowitsm)  } & { `name`: `string` = rt.string } & { `id`: `string` = rt.string } & { `fields`: ``null`` \| { category: string \| null; destIp: boolean \| null; malwareHash: boolean \| null; malwareUrl: boolean \| null; priority: string \| null; sourceIp: boolean \| null; subcategory: string \| null; } ; `type`: [`serviceNowSIR`](../modules/client._internal_namespace.md#servicenowsir)  } & { `name`: `string` = rt.string } & { `id`: `string` = rt.string } & { `fields`: ``null`` \| { caseId: string \| null; } ; `type`: [`swimlane`](../modules/client._internal_namespace.md#swimlane)  } & { `name`: `string` = rt.string } = `CaseConnectorRt`

#### Inherited from

CasesConfigureResponse.connector

___

### created\_at

• **created\_at**: `string` = `rt.string`

#### Inherited from

CasesConfigureResponse.created\_at

___

### created\_by

• **created\_by**: `Object` = `UserRT`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `email` | `undefined` \| ``null`` \| `string` |
| `full_name` | `undefined` \| ``null`` \| `string` |
| `username` | `undefined` \| ``null`` \| `string` |

#### Inherited from

CasesConfigureResponse.created\_by

___

### error

• **error**: ``null`` \| `string`

#### Inherited from

CasesConfigureResponse.error

___

### id

• **id**: `string` = `rt.string`

#### Inherited from

CasesConfigureResponse.id

___

### mappings

• **mappings**: { `action_type`: ``"append"`` \| ``"nothing"`` \| ``"overwrite"`` = ActionTypeRT; `source`: ``"description"`` \| ``"title"`` \| ``"comments"`` = CaseFieldRT; `target`: `string` = ThirdPartyFieldRT }[]

#### Inherited from

CasesConfigureResponse.mappings

___

### owner

• **owner**: `string` = `rt.string`

#### Inherited from

CasesConfigureResponse.owner

___

### updated\_at

• **updated\_at**: ``null`` \| `string`

#### Inherited from

CasesConfigureResponse.updated\_at

___

### updated\_by

• **updated\_by**: ``null`` \| { `email`: `undefined` \| ``null`` \| `string` ; `full_name`: `undefined` \| ``null`` \| `string` ; `username`: `undefined` \| ``null`` \| `string`  }

#### Inherited from

CasesConfigureResponse.updated\_by

___

### version

• **version**: `string` = `rt.string`

#### Inherited from

CasesConfigureResponse.version
