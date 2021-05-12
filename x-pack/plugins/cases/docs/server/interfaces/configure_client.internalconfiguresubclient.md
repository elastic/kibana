[cases](../server_client_api.md) / [configure/client](../modules/configure_client.md) / InternalConfigureSubClient

# Interface: InternalConfigureSubClient

[configure/client](../modules/configure_client.md).InternalConfigureSubClient

Defines the internal helper functions.

## Table of contents

### Methods

- [createMappings](configure_client.internalconfiguresubclient.md#createmappings)
- [getFields](configure_client.internalconfiguresubclient.md#getfields)
- [getMappings](configure_client.internalconfiguresubclient.md#getmappings)
- [updateMappings](configure_client.internalconfiguresubclient.md#updatemappings)

## Methods

### createMappings

▸ **createMappings**(`params`: [*CreateMappingsArgs*](configure_types.createmappingsargs.md)): *Promise*<{ `action_type`: ``"append"`` \| ``"nothing"`` \| ``"overwrite"`` ; `source`: ``"comments"`` \| ``"description"`` \| ``"title"`` ; `target`: *string*  }[]\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `params` | [*CreateMappingsArgs*](configure_types.createmappingsargs.md) |

**Returns:** *Promise*<{ `action_type`: ``"append"`` \| ``"nothing"`` \| ``"overwrite"`` ; `source`: ``"comments"`` \| ``"description"`` \| ``"title"`` ; `target`: *string*  }[]\>

Defined in: [cases/server/client/configure/client.ts:66](https://github.com/jonathan-buttner/kibana/blob/7a61a8b912c/x-pack/plugins/cases/server/client/configure/client.ts#L66)

___

### getFields

▸ **getFields**(`params`: [*ConfigurationGetFields*](configure_types.configurationgetfields.md)): *Promise*<{ `defaultMappings`: { action\_type: "append" \| "nothing" \| "overwrite"; source: "comments" \| "description" \| "title"; target: string; }[] ; `fields`: { id: string; name: string; required: boolean; type: "text" \| "textarea"; }[]  }\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `params` | [*ConfigurationGetFields*](configure_types.configurationgetfields.md) |

**Returns:** *Promise*<{ `defaultMappings`: { action\_type: "append" \| "nothing" \| "overwrite"; source: "comments" \| "description" \| "title"; target: string; }[] ; `fields`: { id: string; name: string; required: boolean; type: "text" \| "textarea"; }[]  }\>

Defined in: [cases/server/client/configure/client.ts:62](https://github.com/jonathan-buttner/kibana/blob/7a61a8b912c/x-pack/plugins/cases/server/client/configure/client.ts#L62)

___

### getMappings

▸ **getMappings**(`params`: [*MappingsArgs*](configure_types.mappingsargs.md)): *Promise*<SavedObjectsFindResult<{ `mappings`: { action\_type: "append" \| "nothing" \| "overwrite"; source: "comments" \| "description" \| "title"; target: string; }[] ; `owner`: *string*  }\>[]\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `params` | [*MappingsArgs*](configure_types.mappingsargs.md) |

**Returns:** *Promise*<SavedObjectsFindResult<{ `mappings`: { action\_type: "append" \| "nothing" \| "overwrite"; source: "comments" \| "description" \| "title"; target: string; }[] ; `owner`: *string*  }\>[]\>

Defined in: [cases/server/client/configure/client.ts:63](https://github.com/jonathan-buttner/kibana/blob/7a61a8b912c/x-pack/plugins/cases/server/client/configure/client.ts#L63)

___

### updateMappings

▸ **updateMappings**(`params`: [*UpdateMappingsArgs*](configure_types.updatemappingsargs.md)): *Promise*<{ `action_type`: ``"append"`` \| ``"nothing"`` \| ``"overwrite"`` ; `source`: ``"comments"`` \| ``"description"`` \| ``"title"`` ; `target`: *string*  }[]\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `params` | [*UpdateMappingsArgs*](configure_types.updatemappingsargs.md) |

**Returns:** *Promise*<{ `action_type`: ``"append"`` \| ``"nothing"`` \| ``"overwrite"`` ; `source`: ``"comments"`` \| ``"description"`` \| ``"title"`` ; `target`: *string*  }[]\>

Defined in: [cases/server/client/configure/client.ts:67](https://github.com/jonathan-buttner/kibana/blob/7a61a8b912c/x-pack/plugins/cases/server/client/configure/client.ts#L67)
