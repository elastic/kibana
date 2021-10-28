[Cases Client API Interface](../cases_client_api.md) / [typedoc_interfaces](../modules/typedoc_interfaces.md) / ICasePostRequest

# Interface: ICasePostRequest

[typedoc_interfaces](../modules/typedoc_interfaces.md).ICasePostRequest

These are simply to make typedoc not attempt to expand the type aliases. If it attempts to expand them
the docs are huge.

## Hierarchy

- *CasePostRequest*

  ↳ **ICasePostRequest**

## Table of contents

### Properties

- [connector](typedoc_interfaces.icasepostrequest.md#connector)
- [description](typedoc_interfaces.icasepostrequest.md#description)
- [owner](typedoc_interfaces.icasepostrequest.md#owner)
- [settings](typedoc_interfaces.icasepostrequest.md#settings)
- [tags](typedoc_interfaces.icasepostrequest.md#tags)
- [title](typedoc_interfaces.icasepostrequest.md#title)
- [type](typedoc_interfaces.icasepostrequest.md#type)

## Properties

### connector

• **connector**: { `id`: *string* ; `name`: *string*  } & { `fields`: ``null`` \| { issueType: string \| null; priority: string \| null; parent: string \| null; } ; `type`: jira  } & { `id`: *string* ; `name`: *string*  } & { `fields`: ``null`` ; `type`: none  } & { `id`: *string* ; `name`: *string*  } & { `fields`: ``null`` \| { incidentTypes: string[] \| null; severityCode: string \| null; } ; `type`: resilient  } & { `id`: *string* ; `name`: *string*  } & { `fields`: ``null`` \| { impact: string \| null; severity: string \| null; urgency: string \| null; category: string \| null; subcategory: string \| null; } ; `type`: serviceNowITSM  } & { `id`: *string* ; `name`: *string*  } & { `fields`: ``null`` \| { category: string \| null; destIp: boolean \| null; malwareHash: boolean \| null; malwareUrl: boolean \| null; priority: string \| null; sourceIp: boolean \| null; subcategory: string \| null; } ; `type`: serviceNowSIR  } & { `id`: *string* ; `name`: *string*  } & { `fields`: ``null`` \| { caseId: string \| null; } ; `type`: swimlane  }

Inherited from: CasePostRequest.connector

___

### description

• **description**: *string*

Inherited from: CasePostRequest.description

___

### owner

• **owner**: *string*

Inherited from: CasePostRequest.owner

___

### settings

• **settings**: *object*

#### Type declaration

| Name | Type |
| :------ | :------ |
| `syncAlerts` | *boolean* |

Inherited from: CasePostRequest.settings

___

### tags

• **tags**: *string*[]

Inherited from: CasePostRequest.tags

___

### title

• **title**: *string*

Inherited from: CasePostRequest.title

___

### type

• **type**: *undefined* \| collection \| individual

Inherited from: CasePostRequest.type
