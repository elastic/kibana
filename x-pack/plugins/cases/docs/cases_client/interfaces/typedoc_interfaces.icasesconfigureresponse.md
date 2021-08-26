[Cases Client API Interface](../cases_client_api.md) / [typedoc_interfaces](../modules/typedoc_interfaces.md) / ICasesConfigureResponse

# Interface: ICasesConfigureResponse

[typedoc_interfaces](../modules/typedoc_interfaces.md).ICasesConfigureResponse

## Hierarchy

- *CasesConfigureResponse*

  ↳ **ICasesConfigureResponse**

## Table of contents

### Properties

- [closure\_type](typedoc_interfaces.icasesconfigureresponse.md#closure_type)
- [connector](typedoc_interfaces.icasesconfigureresponse.md#connector)
- [created\_at](typedoc_interfaces.icasesconfigureresponse.md#created_at)
- [created\_by](typedoc_interfaces.icasesconfigureresponse.md#created_by)
- [error](typedoc_interfaces.icasesconfigureresponse.md#error)
- [id](typedoc_interfaces.icasesconfigureresponse.md#id)
- [mappings](typedoc_interfaces.icasesconfigureresponse.md#mappings)
- [owner](typedoc_interfaces.icasesconfigureresponse.md#owner)
- [updated\_at](typedoc_interfaces.icasesconfigureresponse.md#updated_at)
- [updated\_by](typedoc_interfaces.icasesconfigureresponse.md#updated_by)
- [version](typedoc_interfaces.icasesconfigureresponse.md#version)

## Properties

### closure\_type

• **closure\_type**: ``"close-by-user"`` \| ``"close-by-pushing"``

Inherited from: CasesConfigureResponse.closure\_type

___

### connector

• **connector**: { `id`: *string* ; `name`: *string*  } & { `fields`: ``null`` \| { issueType: string \| null; priority: string \| null; parent: string \| null; } ; `type`: jira  } & { `id`: *string* ; `name`: *string*  } & { `fields`: ``null`` ; `type`: none  } & { `id`: *string* ; `name`: *string*  } & { `fields`: ``null`` \| { incidentTypes: string[] \| null; severityCode: string \| null; } ; `type`: resilient  } & { `id`: *string* ; `name`: *string*  } & { `fields`: ``null`` \| { impact: string \| null; severity: string \| null; urgency: string \| null; category: string \| null; subcategory: string \| null; } ; `type`: serviceNowITSM  } & { `id`: *string* ; `name`: *string*  } & { `fields`: ``null`` \| { category: string \| null; destIp: boolean \| null; malwareHash: boolean \| null; malwareUrl: boolean \| null; priority: string \| null; sourceIp: boolean \| null; subcategory: string \| null; } ; `type`: serviceNowSIR  } & { `id`: *string* ; `name`: *string*  } & { `fields`: ``null`` \| { caseId: string \| null; } ; `type`: swimlane  }

Inherited from: CasesConfigureResponse.connector

___

### created\_at

• **created\_at**: *string*

Inherited from: CasesConfigureResponse.created\_at

___

### created\_by

• **created\_by**: *object*

#### Type declaration

| Name | Type |
| :------ | :------ |
| `email` | *undefined* \| ``null`` \| *string* |
| `full_name` | *undefined* \| ``null`` \| *string* |
| `username` | *undefined* \| ``null`` \| *string* |

Inherited from: CasesConfigureResponse.created\_by

___

### error

• **error**: ``null`` \| *string*

Inherited from: CasesConfigureResponse.error

___

### id

• **id**: *string*

Inherited from: CasesConfigureResponse.id

___

### mappings

• **mappings**: { `action_type`: ``"append"`` \| ``"nothing"`` \| ``"overwrite"`` ; `source`: ``"description"`` \| ``"title"`` \| ``"comments"`` ; `target`: *string*  }[]

Inherited from: CasesConfigureResponse.mappings

___

### owner

• **owner**: *string*

Inherited from: CasesConfigureResponse.owner

___

### updated\_at

• **updated\_at**: ``null`` \| *string*

Inherited from: CasesConfigureResponse.updated\_at

___

### updated\_by

• **updated\_by**: ``null`` \| { `email`: *undefined* \| ``null`` \| *string* ; `full_name`: *undefined* \| ``null`` \| *string* ; `username`: *undefined* \| ``null`` \| *string*  }

Inherited from: CasesConfigureResponse.updated\_by

___

### version

• **version**: *string*

Inherited from: CasesConfigureResponse.version
