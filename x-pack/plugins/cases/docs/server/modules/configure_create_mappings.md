[cases](../server_client_api.md) / configure/create_mappings

# Module: configure/create\_mappings

## Table of contents

### Functions

- [createMappings](configure_create_mappings.md#createmappings)

## Functions

### createMappings

▸ `Const` **createMappings**(`__namedParameters`: [*CreateMappingsArgs*](../interfaces/configure_types.createmappingsargs.md), `clientArgs`: CasesClientArgs, `casesClientInternal`: *CasesClientInternal*): *Promise*<{ `action_type`: ``"append"`` \| ``"nothing"`` \| ``"overwrite"`` ; `source`: ``"comments"`` \| ``"description"`` \| ``"title"`` ; `target`: *string*  }[]\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [*CreateMappingsArgs*](../interfaces/configure_types.createmappingsargs.md) |
| `clientArgs` | CasesClientArgs |
| `casesClientInternal` | *CasesClientInternal* |

**Returns:** *Promise*<{ `action_type`: ``"append"`` \| ``"nothing"`` \| ``"overwrite"`` ; `source`: ``"comments"`` \| ``"description"`` \| ``"title"`` ; `target`: *string*  }[]\>

Defined in: [cases/server/client/configure/create_mappings.ts:14](https://github.com/jonathan-buttner/kibana/blob/7a61a8b912c/x-pack/plugins/cases/server/client/configure/create_mappings.ts#L14)
