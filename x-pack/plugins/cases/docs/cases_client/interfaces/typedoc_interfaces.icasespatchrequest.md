[Cases Client API Interface](../cases_client_api.md) / [typedoc_interfaces](../modules/typedoc_interfaces.md) / ICasesPatchRequest

# Interface: ICasesPatchRequest

[typedoc_interfaces](../modules/typedoc_interfaces.md).ICasesPatchRequest

## Hierarchy

- *CasesPatchRequest*

  ↳ **ICasesPatchRequest**

## Table of contents

### Properties

- [cases](typedoc_interfaces.icasespatchrequest.md#cases)

## Properties

### cases

• **cases**: { `connector`: *undefined* \| { `id`: *string* ; `name`: *string*  } & { `fields`: ``null`` \| { issueType: string \| null; priority: string \| null; parent: string \| null; } ; `type`: jira  } & { `id`: *string* ; `name`: *string*  } & { `fields`: ``null`` ; `type`: none  } & { `id`: *string* ; `name`: *string*  } & { `fields`: ``null`` \| { incidentTypes: string[] \| null; severityCode: string \| null; } ; `type`: resilient  } & { `id`: *string* ; `name`: *string*  } & { `fields`: ``null`` \| { impact: string \| null; severity: string \| null; urgency: string \| null; category: string \| null; subcategory: string \| null; } ; `type`: serviceNowITSM  } & { `id`: *string* ; `name`: *string*  } & { `fields`: ``null`` \| { category: string \| null; destIp: boolean \| null; malwareHash: boolean \| null; malwareUrl: boolean \| null; priority: string \| null; sourceIp: boolean \| null; subcategory: string \| null; } ; `type`: serviceNowSIR  } & { `id`: *string* ; `name`: *string*  } & { `fields`: ``null`` \| { caseId: string \| null; } ; `type`: swimlane  } ; `description`: *undefined* \| *string* ; `owner`: *undefined* \| *string* ; `settings`: *undefined* \| { `syncAlerts`: *boolean*  } ; `status`: *undefined* \| open \| *any*[*any*] \| closed ; `tags`: *undefined* \| *string*[] ; `title`: *undefined* \| *string* ; `type`: *undefined* \| collection \| individual  } & { `id`: *string* ; `version`: *string*  }[]

Inherited from: CasesPatchRequest.cases
