[Cases Client API Interface](../README.md) / [typedoc\_interfaces](../modules/typedoc_interfaces.md) / ICasesConfigurePatch

# Interface: ICasesConfigurePatch

[typedoc_interfaces](../modules/typedoc_interfaces.md).ICasesConfigurePatch

## Hierarchy

- [`CasesConfigurePatch`](../modules/typedoc_interfaces._internal_namespace.md#casesconfigurepatch)

  ↳ **`ICasesConfigurePatch`**

## Table of contents

### Properties

- [closure\_type](typedoc_interfaces.ICasesConfigurePatch.md#closure_type)
- [connector](typedoc_interfaces.ICasesConfigurePatch.md#connector)
- [version](typedoc_interfaces.ICasesConfigurePatch.md#version)

## Properties

### closure\_type

• **closure\_type**: `undefined` \| ``"close-by-user"`` \| ``"close-by-pushing"`` = `ClosureTypeRT`

#### Inherited from

CasesConfigurePatch.closure\_type

___

### connector

• **connector**: `undefined` \| { `id`: `string` = rt.string } & { `fields`: ``null`` \| { issueType: string \| null; priority: string \| null; parent: string \| null; } ; `type`: [`jira`](../modules/client._internal_namespace.md#jira)  } & { `name`: `string` = rt.string } & { `id`: `string` = rt.string } & { `fields`: ``null`` = rt.null; `type`: [`none`](../modules/client._internal_namespace.md#none)  } & { `name`: `string` = rt.string } & { `id`: `string` = rt.string } & { `fields`: ``null`` \| { incidentTypes: string[] \| null; severityCode: string \| null; } ; `type`: [`resilient`](../modules/client._internal_namespace.md#resilient)  } & { `name`: `string` = rt.string } & { `id`: `string` = rt.string } & { `fields`: ``null`` \| { impact: string \| null; severity: string \| null; urgency: string \| null; category: string \| null; subcategory: string \| null; } ; `type`: [`serviceNowITSM`](../modules/client._internal_namespace.md#servicenowitsm)  } & { `name`: `string` = rt.string } & { `id`: `string` = rt.string } & { `fields`: ``null`` \| { category: string \| null; destIp: boolean \| null; malwareHash: boolean \| null; malwareUrl: boolean \| null; priority: string \| null; sourceIp: boolean \| null; subcategory: string \| null; } ; `type`: [`serviceNowSIR`](../modules/client._internal_namespace.md#servicenowsir)  } & { `name`: `string` = rt.string } & { `id`: `string` = rt.string } & { `fields`: ``null`` \| { caseId: string \| null; } ; `type`: [`swimlane`](../modules/client._internal_namespace.md#swimlane)  } & { `name`: `string` = rt.string } = `CaseConnectorRt`

#### Inherited from

CasesConfigurePatch.connector

___

### version

• **version**: `string` = `rt.string`

#### Inherited from

CasesConfigurePatch.version
