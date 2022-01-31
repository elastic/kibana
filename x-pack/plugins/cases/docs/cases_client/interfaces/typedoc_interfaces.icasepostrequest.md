[Cases Client API Interface](../README.md) / [typedoc\_interfaces](../modules/typedoc_interfaces.md) / ICasePostRequest

# Interface: ICasePostRequest

[typedoc_interfaces](../modules/typedoc_interfaces.md).ICasePostRequest

These are simply to make typedoc not attempt to expand the type aliases. If it attempts to expand them
the docs are huge.

## Hierarchy

- [`CasePostRequest`](../modules/typedoc_interfaces.__internalNamespace.md#casepostrequest)

  ↳ **`ICasePostRequest`**

## Table of contents

### Properties

- [connector](typedoc_interfaces.ICasePostRequest.md#connector)
- [description](typedoc_interfaces.ICasePostRequest.md#description)
- [owner](typedoc_interfaces.ICasePostRequest.md#owner)
- [settings](typedoc_interfaces.ICasePostRequest.md#settings)
- [tags](typedoc_interfaces.ICasePostRequest.md#tags)
- [title](typedoc_interfaces.ICasePostRequest.md#title)

## Properties

### connector

• **connector**: { `id`: `string` = rt.string } & { `fields`: ``null`` \| { issueType: string \| null; priority: string \| null; parent: string \| null; } ; `type`: [`jira`](../modules/client.__internalNamespace.md#jira)  } & { `name`: `string` = rt.string } & { `id`: `string` = rt.string } & { `fields`: ``null`` = rt.null; `type`: [`none`](../modules/client.__internalNamespace.md#none)  } & { `name`: `string` = rt.string } & { `id`: `string` = rt.string } & { `fields`: ``null`` \| { incidentTypes: string[] \| null; severityCode: string \| null; } ; `type`: [`resilient`](../modules/client.__internalNamespace.md#resilient)  } & { `name`: `string` = rt.string } & { `id`: `string` = rt.string } & { `fields`: ``null`` \| { impact: string \| null; severity: string \| null; urgency: string \| null; category: string \| null; subcategory: string \| null; } ; `type`: [`serviceNowITSM`](../modules/client.__internalNamespace.md#servicenowitsm)  } & { `name`: `string` = rt.string } & { `id`: `string` = rt.string } & { `fields`: ``null`` \| { category: string \| null; destIp: boolean \| null; malwareHash: boolean \| null; malwareUrl: boolean \| null; priority: string \| null; sourceIp: boolean \| null; subcategory: string \| null; } ; `type`: [`serviceNowSIR`](../modules/client.__internalNamespace.md#servicenowsir)  } & { `name`: `string` = rt.string } & { `id`: `string` = rt.string } & { `fields`: ``null`` \| { caseId: string \| null; } ; `type`: [`swimlane`](../modules/client.__internalNamespace.md#swimlane)  } & { `name`: `string` = rt.string } = `CaseConnectorRt`

#### Inherited from

CasePostRequest.connector

___

### description

• **description**: `string` = `rt.string`

#### Inherited from

CasePostRequest.description

___

### owner

• **owner**: `string` = `rt.string`

#### Inherited from

CasePostRequest.owner

___

### settings

• **settings**: `Object` = `SettingsRt`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `syncAlerts` | `boolean` |

#### Inherited from

CasePostRequest.settings

___

### tags

• **tags**: `string`[]

#### Inherited from

CasePostRequest.tags

___

### title

• **title**: `string` = `rt.string`

#### Inherited from

CasePostRequest.title
