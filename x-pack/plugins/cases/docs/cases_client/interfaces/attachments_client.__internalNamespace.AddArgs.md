[Cases Client API Interface](../README.md) / [attachments/client](../modules/attachments_client.md) / [\_\_internalNamespace](../modules/attachments_client.__internalNamespace.md) / AddArgs

# Interface: AddArgs

[attachments/client](../modules/attachments_client.md).[__internalNamespace](../modules/attachments_client.__internalNamespace.md).AddArgs

The arguments needed for creating a new attachment to a case.

## Table of contents

### Properties

- [caseId](attachments_client.__internalNamespace.AddArgs.md#caseid)
- [comment](attachments_client.__internalNamespace.AddArgs.md#comment)

## Properties

### caseId

• **caseId**: `string`

The case ID that this attachment will be associated with

#### Defined in

[x-pack/plugins/cases/server/client/attachments/add.ts:77](https://github.com/elastic/kibana/blob/06b0f975f60/x-pack/plugins/cases/server/client/attachments/add.ts#L77)

___

### comment

• **comment**: { `comment`: `string` = rt.string; `owner`: `string` = rt.string; `type`: [`user`](../modules/client.__internalNamespace.md#user)  } \| { `alertId`: `string` \| `string`[] ; `index`: `string` \| `string`[] ; `owner`: `string` = rt.string; `rule`: { id: string \| null; name: string \| null; } ; `type`: [`alert`](../modules/client.__internalNamespace.md#alert)  } \| { `actions`: { targets: { hostname: string; endpointId: string; }[]; type: string; } ; `comment`: `string` = rt.string; `owner`: `string` = rt.string; `type`: [`actions`](../modules/client.__internalNamespace.md#actions)  }

The attachment values.

#### Defined in

[x-pack/plugins/cases/server/client/attachments/add.ts:81](https://github.com/elastic/kibana/blob/06b0f975f60/x-pack/plugins/cases/server/client/attachments/add.ts#L81)
