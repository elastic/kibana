[Cases Client API Interface](../README.md) / [attachments/client](../modules/attachments_client.md) / [\_\_internalNamespace](../modules/attachments_client.__internalNamespace.md) / UpdateArgs

# Interface: UpdateArgs

[attachments/client](../modules/attachments_client.md).[__internalNamespace](../modules/attachments_client.__internalNamespace.md).UpdateArgs

Parameters for updating a single attachment

## Table of contents

### Properties

- [caseID](attachments_client.__internalNamespace.UpdateArgs.md#caseid)
- [updateRequest](attachments_client.__internalNamespace.UpdateArgs.md#updaterequest)

## Properties

### caseID

• **caseID**: `string`

The ID of the case that is associated with this attachment

#### Defined in

[x-pack/plugins/cases/server/client/attachments/update.ts:28](https://github.com/elastic/kibana/blob/06b0f975f60/x-pack/plugins/cases/server/client/attachments/update.ts#L28)

___

### updateRequest

• **updateRequest**: { `comment`: `string` = rt.string; `owner`: `string` = rt.string; `type`: [`user`](../modules/client.__internalNamespace.md#user)  } & { `id`: `string` = rt.string; `version`: `string` = rt.string } & { `alertId`: `string` \| `string`[] ; `index`: `string` \| `string`[] ; `owner`: `string` = rt.string; `rule`: { id: string \| null; name: string \| null; } ; `type`: [`alert`](../modules/client.__internalNamespace.md#alert)  } & { `id`: `string` = rt.string; `version`: `string` = rt.string } & { `actions`: { targets: { hostname: string; endpointId: string; }[]; type: string; } ; `comment`: `string` = rt.string; `owner`: `string` = rt.string; `type`: [`actions`](../modules/client.__internalNamespace.md#actions)  } & { `id`: `string` = rt.string; `version`: `string` = rt.string }

The full attachment request with the fields updated with appropriate values

#### Defined in

[x-pack/plugins/cases/server/client/attachments/update.ts:32](https://github.com/elastic/kibana/blob/06b0f975f60/x-pack/plugins/cases/server/client/attachments/update.ts#L32)
