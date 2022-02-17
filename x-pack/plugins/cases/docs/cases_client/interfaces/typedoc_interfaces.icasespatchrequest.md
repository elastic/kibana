[Cases Client API Interface](../README.md) / [typedoc\_interfaces](../modules/typedoc_interfaces.md) / ICasesPatchRequest

# Interface: ICasesPatchRequest

[typedoc_interfaces](../modules/typedoc_interfaces.md).ICasesPatchRequest

## Hierarchy

- [`CasesPatchRequest`](../modules/typedoc_interfaces._internal_namespace.md#casespatchrequest)

  ↳ **`ICasesPatchRequest`**

## Table of contents

### Properties

- [cases](typedoc_interfaces.ICasesPatchRequest.md#cases)

## Properties

### cases

• **cases**: { `connector`: `undefined` \| { `id`: `string` = rt.string } & { `fields`: ``null`` \| { issueType: string \| null; priority: string \| null; parent: string \| null; } ; `type`: [`jira`](../modules/client._internal_namespace.md#jira)  } & { `name`: `string` = rt.string } & { `id`: `string` = rt.string } & { `fields`: ``null`` = rt.null; `type`: [`none`](../modules/client._internal_namespace.md#none)  } & { `name`: `string` = rt.string } & { `id`: `string` = rt.string } & { `fields`: ``null`` \| { incidentTypes: string[] \| null; severityCode: string \| null; } ; `type`: [`resilient`](../modules/client._internal_namespace.md#resilient)  } & { `name`: `string` = rt.string } & { `id`: `string` = rt.string } & { `fields`: ``null`` \| { impact: string \| null; severity: string \| null; urgency: string \| null; category: string \| null; subcategory: string \| null; } ; `type`: [`serviceNowITSM`](../modules/client._internal_namespace.md#servicenowitsm)  } & { `name`: `string` = rt.string } & { `id`: `string` = rt.string } & { `fields`: ``null`` \| { category: string \| null; destIp: boolean \| null; malwareHash: boolean \| null; malwareUrl: boolean \| null; priority: string \| null; sourceIp: boolean \| null; subcategory: string \| null; } ; `type`: [`serviceNowSIR`](../modules/client._internal_namespace.md#servicenowsir)  } & { `name`: `string` = rt.string } & { `id`: `string` = rt.string } & { `fields`: ``null`` \| { caseId: string \| null; } ; `type`: [`swimlane`](../modules/client._internal_namespace.md#swimlane)  } & { `name`: `string` = rt.string } = CaseConnectorRt; `description`: `undefined` \| `string` = rt.string; `owner`: `undefined` \| `string` = rt.string; `settings`: `undefined` \| { `syncAlerts`: `boolean` = rt.boolean } = SettingsRt; `status`: `undefined` \| [`open`](../enums/client._internal_namespace.CaseStatuses.md#open) \| `any`[`any`] \| [`closed`](../enums/client._internal_namespace.CaseStatuses.md#closed) = CaseStatusRt; `tags`: `undefined` \| `string`[] ; `title`: `undefined` \| `string` = rt.string } & { `id`: `string` = rt.string; `version`: `string` = rt.string }[]

#### Inherited from

CasesPatchRequest.cases
