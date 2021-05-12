[cases](../server_client_api.md) / configure/update_mappings

# Module: configure/update\_mappings

## Table of contents

### Functions

- [updateMappings](configure_update_mappings.md#updatemappings)

## Functions

### updateMappings

▸ `Const` **updateMappings**(`__namedParameters`: [*UpdateMappingsArgs*](../interfaces/configure_types.updatemappingsargs.md), `clientArgs`: CasesClientArgs, `casesClientInternal`: *CasesClientInternal*): *Promise*<{ `action_type`: ``"append"`` \| ``"nothing"`` \| ``"overwrite"`` ; `source`: ``"comments"`` \| ``"description"`` \| ``"title"`` ; `target`: *string*  }[]\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [*UpdateMappingsArgs*](../interfaces/configure_types.updatemappingsargs.md) |
| `clientArgs` | CasesClientArgs |
| `casesClientInternal` | *CasesClientInternal* |

**Returns:** *Promise*<{ `action_type`: ``"append"`` \| ``"nothing"`` \| ``"overwrite"`` ; `source`: ``"comments"`` \| ``"description"`` \| ``"title"`` ; `target`: *string*  }[]\>

Defined in: [cases/server/client/configure/update_mappings.ts:14](https://github.com/jonathan-buttner/kibana/blob/7a61a8b912c/x-pack/plugins/cases/server/client/configure/update_mappings.ts#L14)
