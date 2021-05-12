[cases](../server_client_api.md) / configure/get_fields

# Module: configure/get\_fields

## Table of contents

### Functions

- [getFields](configure_get_fields.md#getfields)

## Functions

### getFields

▸ `Const` **getFields**(`__namedParameters`: ConfigurationGetFields, `clientArgs`: CasesClientArgs): *Promise*<{ `defaultMappings`: { action\_type: "append" \| "nothing" \| "overwrite"; source: "comments" \| "description" \| "title"; target: string; }[] ; `fields`: { id: string; name: string; required: boolean; type: "text" \| "textarea"; }[]  }\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | ConfigurationGetFields |
| `clientArgs` | CasesClientArgs |

**Returns:** *Promise*<{ `defaultMappings`: { action\_type: "append" \| "nothing" \| "overwrite"; source: "comments" \| "description" \| "title"; target: string; }[] ; `fields`: { id: string; name: string; required: boolean; type: "text" \| "textarea"; }[]  }\>

Defined in: [cases/server/client/configure/get_fields.ts:19](https://github.com/jonathan-buttner/kibana/blob/7a61a8b912c/x-pack/plugins/cases/server/client/configure/get_fields.ts#L19)
