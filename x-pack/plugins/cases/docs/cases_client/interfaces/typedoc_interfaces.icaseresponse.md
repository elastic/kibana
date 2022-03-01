[Cases Client API Interface](../README.md) / [typedoc\_interfaces](../modules/typedoc_interfaces.md) / ICaseResponse

# Interface: ICaseResponse

[typedoc_interfaces](../modules/typedoc_interfaces.md).ICaseResponse

## Hierarchy

- [`CaseResponse`](../modules/typedoc_interfaces._internal_namespace.md#caseresponse)

  ↳ **`ICaseResponse`**

## Table of contents

### Properties

- [closed\_at](typedoc_interfaces.ICaseResponse.md#closed_at)
- [closed\_by](typedoc_interfaces.ICaseResponse.md#closed_by)
- [comments](typedoc_interfaces.ICaseResponse.md#comments)
- [connector](typedoc_interfaces.ICaseResponse.md#connector)
- [created\_at](typedoc_interfaces.ICaseResponse.md#created_at)
- [created\_by](typedoc_interfaces.ICaseResponse.md#created_by)
- [description](typedoc_interfaces.ICaseResponse.md#description)
- [external\_service](typedoc_interfaces.ICaseResponse.md#external_service)
- [id](typedoc_interfaces.ICaseResponse.md#id)
- [owner](typedoc_interfaces.ICaseResponse.md#owner)
- [settings](typedoc_interfaces.ICaseResponse.md#settings)
- [status](typedoc_interfaces.ICaseResponse.md#status)
- [tags](typedoc_interfaces.ICaseResponse.md#tags)
- [title](typedoc_interfaces.ICaseResponse.md#title)
- [totalAlerts](typedoc_interfaces.ICaseResponse.md#totalalerts)
- [totalComment](typedoc_interfaces.ICaseResponse.md#totalcomment)
- [updated\_at](typedoc_interfaces.ICaseResponse.md#updated_at)
- [updated\_by](typedoc_interfaces.ICaseResponse.md#updated_by)
- [version](typedoc_interfaces.ICaseResponse.md#version)

## Properties

### closed\_at

• **closed\_at**: ``null`` \| `string`

#### Inherited from

CaseResponse.closed\_at

___

### closed\_by

• **closed\_by**: ``null`` \| { `email`: `undefined` \| ``null`` \| `string` ; `full_name`: `undefined` \| ``null`` \| `string` ; `username`: `undefined` \| ``null`` \| `string`  }

#### Inherited from

CaseResponse.closed\_by

___

### comments

• **comments**: `undefined` \| { `comment`: `string` = rt.string; `owner`: `string` = rt.string; `type`: [`user`](../modules/client._internal_namespace.md#user)  } & { `created_at`: `string` = rt.string; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } = UserRT; `owner`: `string` = rt.string; `pushed_at`: ``null`` \| `string` ; `pushed_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `updated_at`: ``null`` \| `string` ; `updated_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }  } & { `id`: `string` = rt.string; `version`: `string` = rt.string } & { `alertId`: `string` \| `string`[] ; `index`: `string` \| `string`[] ; `owner`: `string` = rt.string; `rule`: { id: string \| null; name: string \| null; } ; `type`: [`alert`](../modules/client._internal_namespace.md#alert)  } & { `created_at`: `string` = rt.string; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } = UserRT; `owner`: `string` = rt.string; `pushed_at`: ``null`` \| `string` ; `pushed_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `updated_at`: ``null`` \| `string` ; `updated_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }  } & { `id`: `string` = rt.string; `version`: `string` = rt.string } & { `actions`: { targets: { hostname: string; endpointId: string; }[]; type: string; } ; `comment`: `string` = rt.string; `owner`: `string` = rt.string; `type`: [`actions`](../modules/client._internal_namespace.md#actions)  } & { `created_at`: `string` = rt.string; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } = UserRT; `owner`: `string` = rt.string; `pushed_at`: ``null`` \| `string` ; `pushed_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `updated_at`: ``null`` \| `string` ; `updated_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }  } & { `id`: `string` = rt.string; `version`: `string` = rt.string }[]

#### Inherited from

CaseResponse.comments

___

### connector

• **connector**: { `id`: `string` = rt.string } & { `fields`: ``null`` \| { issueType: string \| null; priority: string \| null; parent: string \| null; } ; `type`: [`jira`](../modules/client._internal_namespace.md#jira)  } & { `name`: `string` = rt.string } & { `id`: `string` = rt.string } & { `fields`: ``null`` = rt.null; `type`: [`none`](../modules/client._internal_namespace.md#none)  } & { `name`: `string` = rt.string } & { `id`: `string` = rt.string } & { `fields`: ``null`` \| { incidentTypes: string[] \| null; severityCode: string \| null; } ; `type`: [`resilient`](../modules/client._internal_namespace.md#resilient)  } & { `name`: `string` = rt.string } & { `id`: `string` = rt.string } & { `fields`: ``null`` \| { impact: string \| null; severity: string \| null; urgency: string \| null; category: string \| null; subcategory: string \| null; } ; `type`: [`serviceNowITSM`](../modules/client._internal_namespace.md#servicenowitsm)  } & { `name`: `string` = rt.string } & { `id`: `string` = rt.string } & { `fields`: ``null`` \| { category: string \| null; destIp: boolean \| null; malwareHash: boolean \| null; malwareUrl: boolean \| null; priority: string \| null; sourceIp: boolean \| null; subcategory: string \| null; } ; `type`: [`serviceNowSIR`](../modules/client._internal_namespace.md#servicenowsir)  } & { `name`: `string` = rt.string } & { `id`: `string` = rt.string } & { `fields`: ``null`` \| { caseId: string \| null; } ; `type`: [`swimlane`](../modules/client._internal_namespace.md#swimlane)  } & { `name`: `string` = rt.string } = `CaseConnectorRt`

#### Inherited from

CaseResponse.connector

___

### created\_at

• **created\_at**: `string` = `rt.string`

#### Inherited from

CaseResponse.created\_at

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

CaseResponse.created\_by

___

### description

• **description**: `string` = `rt.string`

#### Inherited from

CaseResponse.description

___

### external\_service

• **external\_service**: ``null`` \| { `connector_id`: `string` = rt.string } & { `connector_name`: `string` = rt.string; `external_id`: `string` = rt.string; `external_title`: `string` = rt.string; `external_url`: `string` = rt.string; `pushed_at`: `string` = rt.string; `pushed_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } = UserRT } = `CaseFullExternalServiceRt`

#### Inherited from

CaseResponse.external\_service

___

### id

• **id**: `string` = `rt.string`

#### Inherited from

CaseResponse.id

___

### owner

• **owner**: `string` = `rt.string`

#### Inherited from

CaseResponse.owner

___

### settings

• **settings**: `Object` = `SettingsRt`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `syncAlerts` | `boolean` |

#### Inherited from

CaseResponse.settings

___

### status

• **status**: `CaseStatuses` = `CaseStatusRt`

#### Inherited from

CaseResponse.status

___

### tags

• **tags**: `string`[]

#### Inherited from

CaseResponse.tags

___

### title

• **title**: `string` = `rt.string`

#### Inherited from

CaseResponse.title

___

### totalAlerts

• **totalAlerts**: `number` = `rt.number`

#### Inherited from

CaseResponse.totalAlerts

___

### totalComment

• **totalComment**: `number` = `rt.number`

#### Inherited from

CaseResponse.totalComment

___

### updated\_at

• **updated\_at**: ``null`` \| `string`

#### Inherited from

CaseResponse.updated\_at

___

### updated\_by

• **updated\_by**: ``null`` \| { `email`: `undefined` \| ``null`` \| `string` ; `full_name`: `undefined` \| ``null`` \| `string` ; `username`: `undefined` \| ``null`` \| `string`  }

#### Inherited from

CaseResponse.updated\_by

___

### version

• **version**: `string` = `rt.string`

#### Inherited from

CaseResponse.version
