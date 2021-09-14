[Cases Client API Interface](../cases_client_api.md) / [typedoc_interfaces](../modules/typedoc_interfaces.md) / ICasesConfigureRequest

# Interface: ICasesConfigureRequest

[typedoc_interfaces](../modules/typedoc_interfaces.md).ICasesConfigureRequest

## Hierarchy

- *CasesConfigureRequest*

  ↳ **ICasesConfigureRequest**

## Table of contents

### Properties

- [closure\_type](typedoc_interfaces.icasesconfigurerequest.md#closure_type)
- [connector](typedoc_interfaces.icasesconfigurerequest.md#connector)
- [owner](typedoc_interfaces.icasesconfigurerequest.md#owner)

## Properties

### closure\_type

• **closure\_type**: ``"close-by-user"`` \| ``"close-by-pushing"``

Inherited from: CasesConfigureRequest.closure\_type

___

### connector

• **connector**: { `id`: *string* ; `name`: *string*  } & { `fields`: ``null`` \| { issueType: string \| null; priority: string \| null; parent: string \| null; } ; `type`: jira  } & { `id`: *string* ; `name`: *string*  } & { `fields`: ``null`` ; `type`: none  } & { `id`: *string* ; `name`: *string*  } & { `fields`: ``null`` \| { incidentTypes: string[] \| null; severityCode: string \| null; } ; `type`: resilient  } & { `id`: *string* ; `name`: *string*  } & { `fields`: ``null`` \| { impact: string \| null; severity: string \| null; urgency: string \| null; category: string \| null; subcategory: string \| null; } ; `type`: serviceNowITSM  } & { `id`: *string* ; `name`: *string*  } & { `fields`: ``null`` \| { category: string \| null; destIp: boolean \| null; malwareHash: boolean \| null; malwareUrl: boolean \| null; priority: string \| null; sourceIp: boolean \| null; subcategory: string \| null; } ; `type`: serviceNowSIR  } & { `id`: *string* ; `name`: *string*  } & { `fields`: ``null`` \| { caseId: string \| null; } ; `type`: swimlane  }

Inherited from: CasesConfigureRequest.connector

___

### owner

• **owner**: *string*

Inherited from: CasesConfigureRequest.owner
