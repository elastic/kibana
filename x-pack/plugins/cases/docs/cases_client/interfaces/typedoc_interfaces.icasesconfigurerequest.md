[Cases Client API Interface](../README.md) / [typedoc\_interfaces](../modules/typedoc_interfaces.md) / ICasesConfigureRequest

# Interface: ICasesConfigureRequest

[typedoc_interfaces](../modules/typedoc_interfaces.md).ICasesConfigureRequest

## Hierarchy

- [`CasesConfigureRequest`](../modules/typedoc_interfaces._internal_namespace.md#casesconfigurerequest)

  ↳ **`ICasesConfigureRequest`**

## Table of contents

### Properties

- [closure\_type](typedoc_interfaces.ICasesConfigureRequest.md#closure_type)
- [connector](typedoc_interfaces.ICasesConfigureRequest.md#connector)
- [owner](typedoc_interfaces.ICasesConfigureRequest.md#owner)

## Properties

### closure\_type

• **closure\_type**: ``"close-by-user"`` \| ``"close-by-pushing"`` = `ClosureTypeRT`

#### Inherited from

CasesConfigureRequest.closure\_type

___

### connector

• **connector**: { `id`: `string` = rt.string } & { `fields`: ``null`` \| { issueType: string \| null; priority: string \| null; parent: string \| null; } ; `type`: [`jira`](../modules/client._internal_namespace.md#jira)  } & { `name`: `string` = rt.string } & { `id`: `string` = rt.string } & { `fields`: ``null`` = rt.null; `type`: [`none`](../modules/client._internal_namespace.md#none)  } & { `name`: `string` = rt.string } & { `id`: `string` = rt.string } & { `fields`: ``null`` \| { incidentTypes: string[] \| null; severityCode: string \| null; } ; `type`: [`resilient`](../modules/client._internal_namespace.md#resilient)  } & { `name`: `string` = rt.string } & { `id`: `string` = rt.string } & { `fields`: ``null`` \| { impact: string \| null; severity: string \| null; urgency: string \| null; category: string \| null; subcategory: string \| null; } ; `type`: [`serviceNowITSM`](../modules/client._internal_namespace.md#servicenowitsm)  } & { `name`: `string` = rt.string } & { `id`: `string` = rt.string } & { `fields`: ``null`` \| { category: string \| null; destIp: boolean \| null; malwareHash: boolean \| null; malwareUrl: boolean \| null; priority: string \| null; sourceIp: boolean \| null; subcategory: string \| null; } ; `type`: [`serviceNowSIR`](../modules/client._internal_namespace.md#servicenowsir)  } & { `name`: `string` = rt.string } & { `id`: `string` = rt.string } & { `fields`: ``null`` \| { caseId: string \| null; } ; `type`: [`swimlane`](../modules/client._internal_namespace.md#swimlane)  } & { `name`: `string` = rt.string } = `CaseConnectorRt`

#### Inherited from

CasesConfigureRequest.connector

___

### owner

• **owner**: `string` = `rt.string`

#### Inherited from

CasesConfigureRequest.owner
