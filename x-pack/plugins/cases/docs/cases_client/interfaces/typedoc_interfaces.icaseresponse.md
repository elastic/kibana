[Cases Client API Interface](../cases_client_api.md) / [typedoc_interfaces](../modules/typedoc_interfaces.md) / ICaseResponse

# Interface: ICaseResponse

[typedoc_interfaces](../modules/typedoc_interfaces.md).ICaseResponse

## Hierarchy

- *CaseResponse*

  ↳ **ICaseResponse**

## Table of contents

### Properties

- [closed\_at](typedoc_interfaces.icaseresponse.md#closed_at)
- [closed\_by](typedoc_interfaces.icaseresponse.md#closed_by)
- [comments](typedoc_interfaces.icaseresponse.md#comments)
- [connector](typedoc_interfaces.icaseresponse.md#connector)
- [created\_at](typedoc_interfaces.icaseresponse.md#created_at)
- [created\_by](typedoc_interfaces.icaseresponse.md#created_by)
- [description](typedoc_interfaces.icaseresponse.md#description)
- [external\_service](typedoc_interfaces.icaseresponse.md#external_service)
- [id](typedoc_interfaces.icaseresponse.md#id)
- [owner](typedoc_interfaces.icaseresponse.md#owner)
- [settings](typedoc_interfaces.icaseresponse.md#settings)
- [status](typedoc_interfaces.icaseresponse.md#status)
- [subCaseIds](typedoc_interfaces.icaseresponse.md#subcaseids)
- [subCases](typedoc_interfaces.icaseresponse.md#subcases)
- [tags](typedoc_interfaces.icaseresponse.md#tags)
- [title](typedoc_interfaces.icaseresponse.md#title)
- [totalAlerts](typedoc_interfaces.icaseresponse.md#totalalerts)
- [totalComment](typedoc_interfaces.icaseresponse.md#totalcomment)
- [type](typedoc_interfaces.icaseresponse.md#type)
- [updated\_at](typedoc_interfaces.icaseresponse.md#updated_at)
- [updated\_by](typedoc_interfaces.icaseresponse.md#updated_by)
- [version](typedoc_interfaces.icaseresponse.md#version)

## Properties

### closed\_at

• **closed\_at**: ``null`` \| *string*

Inherited from: CaseResponse.closed\_at

___

### closed\_by

• **closed\_by**: ``null`` \| { `email`: *undefined* \| ``null`` \| *string* ; `full_name`: *undefined* \| ``null`` \| *string* ; `username`: *undefined* \| ``null`` \| *string*  }

Inherited from: CaseResponse.closed\_by

___

### comments

• **comments**: *undefined* \| { `comment`: *string* ; `owner`: *string* ; `type`: user  } & { `associationType`: AssociationType ; `created_at`: *string* ; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `owner`: *string* ; `pushed_at`: ``null`` \| *string* ; `pushed_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `updated_at`: ``null`` \| *string* ; `updated_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }  } & { `id`: *string* ; `version`: *string*  } & { `alertId`: *string* \| *string*[] ; `index`: *string* \| *string*[] ; `owner`: *string* ; `rule`: { id: string \| null; name: string \| null; } ; `type`: alert \| generatedAlert  } & { `associationType`: AssociationType ; `created_at`: *string* ; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `owner`: *string* ; `pushed_at`: ``null`` \| *string* ; `pushed_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `updated_at`: ``null`` \| *string* ; `updated_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }  } & { `id`: *string* ; `version`: *string*  } & { `actions`: { targets: { hostname: string; endpointId: string; }[]; type: string; } ; `comment`: *string* ; `owner`: *string* ; `type`: actions  } & { `associationType`: AssociationType ; `created_at`: *string* ; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `owner`: *string* ; `pushed_at`: ``null`` \| *string* ; `pushed_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `updated_at`: ``null`` \| *string* ; `updated_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }  } & { `id`: *string* ; `version`: *string*  }[]

Inherited from: CaseResponse.comments

___

### connector

• **connector**: { `id`: *string* ; `name`: *string*  } & { `fields`: ``null`` \| { issueType: string \| null; priority: string \| null; parent: string \| null; } ; `type`: jira  } & { `id`: *string* ; `name`: *string*  } & { `fields`: ``null`` ; `type`: none  } & { `id`: *string* ; `name`: *string*  } & { `fields`: ``null`` \| { incidentTypes: string[] \| null; severityCode: string \| null; } ; `type`: resilient  } & { `id`: *string* ; `name`: *string*  } & { `fields`: ``null`` \| { impact: string \| null; severity: string \| null; urgency: string \| null; category: string \| null; subcategory: string \| null; } ; `type`: serviceNowITSM  } & { `id`: *string* ; `name`: *string*  } & { `fields`: ``null`` \| { category: string \| null; destIp: boolean \| null; malwareHash: boolean \| null; malwareUrl: boolean \| null; priority: string \| null; sourceIp: boolean \| null; subcategory: string \| null; } ; `type`: serviceNowSIR  } & { `id`: *string* ; `name`: *string*  } & { `fields`: ``null`` \| { caseId: string \| null; } ; `type`: swimlane  }

Inherited from: CaseResponse.connector

___

### created\_at

• **created\_at**: *string*

Inherited from: CaseResponse.created\_at

___

### created\_by

• **created\_by**: *object*

#### Type declaration

| Name | Type |
| :------ | :------ |
| `email` | *undefined* \| ``null`` \| *string* |
| `full_name` | *undefined* \| ``null`` \| *string* |
| `username` | *undefined* \| ``null`` \| *string* |

Inherited from: CaseResponse.created\_by

___

### description

• **description**: *string*

Inherited from: CaseResponse.description

___

### external\_service

• **external\_service**: ``null`` \| { `connector_id`: *string* ; `connector_name`: *string* ; `external_id`: *string* ; `external_title`: *string* ; `external_url`: *string*  } & { `pushed_at`: *string* ; `pushed_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }  }

Inherited from: CaseResponse.external\_service

___

### id

• **id**: *string*

Inherited from: CaseResponse.id

___

### owner

• **owner**: *string*

Inherited from: CaseResponse.owner

___

### settings

• **settings**: *object*

#### Type declaration

| Name | Type |
| :------ | :------ |
| `syncAlerts` | *boolean* |

Inherited from: CaseResponse.settings

___

### status

• **status**: CaseStatuses

Inherited from: CaseResponse.status

___

### subCaseIds

• **subCaseIds**: *undefined* \| *string*[]

Inherited from: CaseResponse.subCaseIds

___

### subCases

• **subCases**: *undefined* \| { `status`: CaseStatuses  } & { `closed_at`: ``null`` \| *string* ; `closed_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `created_at`: *string* ; `created_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `owner`: *string* ; `updated_at`: ``null`` \| *string* ; `updated_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }  } & { `id`: *string* ; `totalAlerts`: *number* ; `totalComment`: *number* ; `version`: *string*  } & { `comments`: *undefined* \| { `comment`: *string* ; `owner`: *string* ; `type`: user  } & { `associationType`: AssociationType ; `created_at`: *string* ; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `owner`: *string* ; `pushed_at`: ``null`` \| *string* ; `pushed_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `updated_at`: ``null`` \| *string* ; `updated_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }  } & { `id`: *string* ; `version`: *string*  } & { `alertId`: *string* \| *string*[] ; `index`: *string* \| *string*[] ; `owner`: *string* ; `rule`: { id: string \| null; name: string \| null; } ; `type`: alert \| generatedAlert  } & { `associationType`: AssociationType ; `created_at`: *string* ; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `owner`: *string* ; `pushed_at`: ``null`` \| *string* ; `pushed_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `updated_at`: ``null`` \| *string* ; `updated_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }  } & { `id`: *string* ; `version`: *string*  } & { `actions`: { targets: { hostname: string; endpointId: string; }[]; type: string; } ; `comment`: *string* ; `owner`: *string* ; `type`: actions  } & { `associationType`: AssociationType ; `created_at`: *string* ; `created_by`: { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `owner`: *string* ; `pushed_at`: ``null`` \| *string* ; `pushed_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; } ; `updated_at`: ``null`` \| *string* ; `updated_by`: ``null`` \| { email: string \| null \| undefined; full\_name: string \| null \| undefined; username: string \| null \| undefined; }  } & { `id`: *string* ; `version`: *string*  }[]  }[]

Inherited from: CaseResponse.subCases

___

### tags

• **tags**: *string*[]

Inherited from: CaseResponse.tags

___

### title

• **title**: *string*

Inherited from: CaseResponse.title

___

### totalAlerts

• **totalAlerts**: *number*

Inherited from: CaseResponse.totalAlerts

___

### totalComment

• **totalComment**: *number*

Inherited from: CaseResponse.totalComment

___

### type

• **type**: CaseType

Inherited from: CaseResponse.type

___

### updated\_at

• **updated\_at**: ``null`` \| *string*

Inherited from: CaseResponse.updated\_at

___

### updated\_by

• **updated\_by**: ``null`` \| { `email`: *undefined* \| ``null`` \| *string* ; `full_name`: *undefined* \| ``null`` \| *string* ; `username`: *undefined* \| ``null`` \| *string*  }

Inherited from: CaseResponse.updated\_by

___

### version

• **version**: *string*

Inherited from: CaseResponse.version
