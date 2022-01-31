[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_\_internalNamespace](../modules/client.__internalNamespace.md) / PostConnectorMappingsArgs

# Interface: PostConnectorMappingsArgs

[client](../modules/client.md).[__internalNamespace](../modules/client.__internalNamespace.md).PostConnectorMappingsArgs

## Hierarchy

- [`ClientArgs`](client.__internalNamespace.ClientArgs-2.md)

  ↳ **`PostConnectorMappingsArgs`**

## Table of contents

### Properties

- [attributes](client.__internalNamespace.PostConnectorMappingsArgs.md#attributes)
- [references](client.__internalNamespace.PostConnectorMappingsArgs.md#references)
- [unsecuredSavedObjectsClient](client.__internalNamespace.PostConnectorMappingsArgs.md#unsecuredsavedobjectsclient)

## Properties

### attributes

• **attributes**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `mappings` | { action\_type: "append" \| "nothing" \| "overwrite"; source: "description" \| "title" \| "comments"; target: string; }[] |
| `owner` | `string` |

#### Defined in

[x-pack/plugins/cases/server/services/connector_mappings/index.ts:22](https://github.com/elastic/kibana/blob/06b0f975f60/x-pack/plugins/cases/server/services/connector_mappings/index.ts#L22)

___

### references

• **references**: [`SavedObjectReference`](client.__internalNamespace.SavedObjectReference.md)[]

#### Defined in

[x-pack/plugins/cases/server/services/connector_mappings/index.ts:23](https://github.com/elastic/kibana/blob/06b0f975f60/x-pack/plugins/cases/server/services/connector_mappings/index.ts#L23)

___

### unsecuredSavedObjectsClient

• **unsecuredSavedObjectsClient**: [`SavedObjectsClientContract`](../modules/client.__internalNamespace.md#savedobjectsclientcontract)

#### Inherited from

[ClientArgs](client.__internalNamespace.ClientArgs-2.md).[unsecuredSavedObjectsClient](client.__internalNamespace.ClientArgs-2.md#unsecuredsavedobjectsclient)

#### Defined in

[x-pack/plugins/cases/server/services/connector_mappings/index.ts:15](https://github.com/elastic/kibana/blob/06b0f975f60/x-pack/plugins/cases/server/services/connector_mappings/index.ts#L15)
