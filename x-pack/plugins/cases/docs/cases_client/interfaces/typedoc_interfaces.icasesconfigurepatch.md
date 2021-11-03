[Cases Client API Interface](../cases_client_api.md) / [typedoc_interfaces](../modules/typedoc_interfaces.md) / ICasesConfigurePatch

# Interface: ICasesConfigurePatch

[typedoc_interfaces](../modules/typedoc_interfaces.md).ICasesConfigurePatch

## Hierarchy

- *CasesConfigurePatch*

  ↳ **ICasesConfigurePatch**

## Table of contents

### Properties

- [closure\_type](typedoc_interfaces.icasesconfigurepatch.md#closure_type)
- [connector](typedoc_interfaces.icasesconfigurepatch.md#connector)
- [version](typedoc_interfaces.icasesconfigurepatch.md#version)

## Properties

### closure\_type

• **closure\_type**: *undefined* \| ``"close-by-user"`` \| ``"close-by-pushing"``

Inherited from: CasesConfigurePatch.closure\_type

___

### connector

• **connector**: *undefined* \| { `id`: *string* ; `name`: *string*  } & { `fields`: ``null`` \| { issueType: string \| null; priority: string \| null; parent: string \| null; } ; `type`: jira  } & { `id`: *string* ; `name`: *string*  } & { `fields`: ``null`` ; `type`: none  } & { `id`: *string* ; `name`: *string*  } & { `fields`: ``null`` \| { incidentTypes: string[] \| null; severityCode: string \| null; } ; `type`: resilient  } & { `id`: *string* ; `name`: *string*  } & { `fields`: ``null`` \| { impact: string \| null; severity: string \| null; urgency: string \| null; category: string \| null; subcategory: string \| null; } ; `type`: serviceNowITSM  } & { `id`: *string* ; `name`: *string*  } & { `fields`: ``null`` \| { category: string \| null; destIp: boolean \| null; malwareHash: boolean \| null; malwareUrl: boolean \| null; priority: string \| null; sourceIp: boolean \| null; subcategory: string \| null; } ; `type`: serviceNowSIR  } & { `id`: *string* ; `name`: *string*  } & { `fields`: ``null`` \| { caseId: string \| null; } ; `type`: swimlane  }

Inherited from: CasesConfigurePatch.connector

___

### version

• **version**: *string*

Inherited from: CasesConfigurePatch.version
