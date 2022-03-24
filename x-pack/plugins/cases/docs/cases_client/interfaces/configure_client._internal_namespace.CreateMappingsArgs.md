[Cases Client API Interface](../README.md) / [configure/client](../modules/configure_client.md) / [\_internal\_namespace](../modules/configure_client._internal_namespace.md) / CreateMappingsArgs

# Interface: CreateMappingsArgs

[configure/client](../modules/configure_client.md).[_internal_namespace](../modules/configure_client._internal_namespace.md).CreateMappingsArgs

## Hierarchy

- [`MappingsArgs`](configure_client._internal_namespace.MappingsArgs.md)

  ↳ **`CreateMappingsArgs`**

## Table of contents

### Properties

- [connector](configure_client._internal_namespace.CreateMappingsArgs.md#connector)
- [owner](configure_client._internal_namespace.CreateMappingsArgs.md#owner)

## Properties

### connector

• **connector**: { `id`: `string` = rt.string } & { `fields`: ``null`` \| { issueType: string \| null; priority: string \| null; parent: string \| null; } ; `type`: [`jira`](../modules/client._internal_namespace.md#jira)  } & { `name`: `string` = rt.string } & { `id`: `string` = rt.string } & { `fields`: ``null`` = rt.null; `type`: [`none`](../modules/client._internal_namespace.md#none)  } & { `name`: `string` = rt.string } & { `id`: `string` = rt.string } & { `fields`: ``null`` \| { incidentTypes: string[] \| null; severityCode: string \| null; } ; `type`: [`resilient`](../modules/client._internal_namespace.md#resilient)  } & { `name`: `string` = rt.string } & { `id`: `string` = rt.string } & { `fields`: ``null`` \| { impact: string \| null; severity: string \| null; urgency: string \| null; category: string \| null; subcategory: string \| null; } ; `type`: [`serviceNowITSM`](../modules/client._internal_namespace.md#servicenowitsm)  } & { `name`: `string` = rt.string } & { `id`: `string` = rt.string } & { `fields`: ``null`` \| { category: string \| null; destIp: boolean \| null; malwareHash: boolean \| null; malwareUrl: boolean \| null; priority: string \| null; sourceIp: boolean \| null; subcategory: string \| null; } ; `type`: [`serviceNowSIR`](../modules/client._internal_namespace.md#servicenowsir)  } & { `name`: `string` = rt.string } & { `id`: `string` = rt.string } & { `fields`: ``null`` \| { caseId: string \| null; } ; `type`: [`swimlane`](../modules/client._internal_namespace.md#swimlane)  } & { `name`: `string` = rt.string }

#### Inherited from

[MappingsArgs](configure_client._internal_namespace.MappingsArgs.md).[connector](configure_client._internal_namespace.MappingsArgs.md#connector)

#### Defined in

[x-pack/plugins/cases/server/client/configure/types.ts:11](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/client/configure/types.ts#L11)

___

### owner

• **owner**: `string`

#### Defined in

[x-pack/plugins/cases/server/client/configure/types.ts:15](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/client/configure/types.ts#L15)
