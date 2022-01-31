[Cases Client API Interface](../README.md) / [configure/client](../modules/configure_client.md) / [\_\_internalNamespace](../modules/configure_client.__internalNamespace.md) / MappingsArgs

# Interface: MappingsArgs

[configure/client](../modules/configure_client.md).[__internalNamespace](../modules/configure_client.__internalNamespace.md).MappingsArgs

## Hierarchy

- **`MappingsArgs`**

  ↳ [`CreateMappingsArgs`](configure_client.__internalNamespace.CreateMappingsArgs.md)

  ↳ [`UpdateMappingsArgs`](configure_client.__internalNamespace.UpdateMappingsArgs.md)

## Table of contents

### Properties

- [connector](configure_client.__internalNamespace.MappingsArgs.md#connector)

## Properties

### connector

• **connector**: { `id`: `string` = rt.string } & { `fields`: ``null`` \| { issueType: string \| null; priority: string \| null; parent: string \| null; } ; `type`: [`jira`](../modules/client.__internalNamespace.md#jira)  } & { `name`: `string` = rt.string } & { `id`: `string` = rt.string } & { `fields`: ``null`` = rt.null; `type`: [`none`](../modules/client.__internalNamespace.md#none)  } & { `name`: `string` = rt.string } & { `id`: `string` = rt.string } & { `fields`: ``null`` \| { incidentTypes: string[] \| null; severityCode: string \| null; } ; `type`: [`resilient`](../modules/client.__internalNamespace.md#resilient)  } & { `name`: `string` = rt.string } & { `id`: `string` = rt.string } & { `fields`: ``null`` \| { impact: string \| null; severity: string \| null; urgency: string \| null; category: string \| null; subcategory: string \| null; } ; `type`: [`serviceNowITSM`](../modules/client.__internalNamespace.md#servicenowitsm)  } & { `name`: `string` = rt.string } & { `id`: `string` = rt.string } & { `fields`: ``null`` \| { category: string \| null; destIp: boolean \| null; malwareHash: boolean \| null; malwareUrl: boolean \| null; priority: string \| null; sourceIp: boolean \| null; subcategory: string \| null; } ; `type`: [`serviceNowSIR`](../modules/client.__internalNamespace.md#servicenowsir)  } & { `name`: `string` = rt.string } & { `id`: `string` = rt.string } & { `fields`: ``null`` \| { caseId: string \| null; } ; `type`: [`swimlane`](../modules/client.__internalNamespace.md#swimlane)  } & { `name`: `string` = rt.string }

#### Defined in

[x-pack/plugins/cases/server/client/configure/types.ts:11](https://github.com/elastic/kibana/blob/06b0f975f60/x-pack/plugins/cases/server/client/configure/types.ts#L11)
