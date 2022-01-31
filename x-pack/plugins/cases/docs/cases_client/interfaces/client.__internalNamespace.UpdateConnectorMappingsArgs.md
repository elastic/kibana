[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_\_internalNamespace](../modules/client.__internalNamespace.md) / UpdateConnectorMappingsArgs

# Interface: UpdateConnectorMappingsArgs

[client](../modules/client.md).[__internalNamespace](../modules/client.__internalNamespace.md).UpdateConnectorMappingsArgs

## Hierarchy

- [`ClientArgs`](client.__internalNamespace.ClientArgs-2.md)

  ↳ **`UpdateConnectorMappingsArgs`**

## Table of contents

### Properties

- [attributes](client.__internalNamespace.UpdateConnectorMappingsArgs.md#attributes)
- [mappingId](client.__internalNamespace.UpdateConnectorMappingsArgs.md#mappingid)
- [references](client.__internalNamespace.UpdateConnectorMappingsArgs.md#references)
- [unsecuredSavedObjectsClient](client.__internalNamespace.UpdateConnectorMappingsArgs.md#unsecuredsavedobjectsclient)

## Properties

### attributes

• **attributes**: `Partial`<{ `mappings`: { action\_type: "append" \| "nothing" \| "overwrite"; source: "description" \| "title" \| "comments"; target: string; }[] ; `owner`: `string` = rt.string }\>

#### Defined in

[x-pack/plugins/cases/server/services/connector_mappings/index.ts:28](https://github.com/elastic/kibana/blob/06b0f975f60/x-pack/plugins/cases/server/services/connector_mappings/index.ts#L28)

___

### mappingId

• **mappingId**: `string`

#### Defined in

[x-pack/plugins/cases/server/services/connector_mappings/index.ts:27](https://github.com/elastic/kibana/blob/06b0f975f60/x-pack/plugins/cases/server/services/connector_mappings/index.ts#L27)

___

### references

• **references**: [`SavedObjectReference`](client.__internalNamespace.SavedObjectReference.md)[]

#### Defined in

[x-pack/plugins/cases/server/services/connector_mappings/index.ts:29](https://github.com/elastic/kibana/blob/06b0f975f60/x-pack/plugins/cases/server/services/connector_mappings/index.ts#L29)

___

### unsecuredSavedObjectsClient

• **unsecuredSavedObjectsClient**: [`SavedObjectsClientContract`](../modules/client.__internalNamespace.md#savedobjectsclientcontract)

#### Inherited from

[ClientArgs](client.__internalNamespace.ClientArgs-2.md).[unsecuredSavedObjectsClient](client.__internalNamespace.ClientArgs-2.md#unsecuredsavedobjectsclient)

#### Defined in

[x-pack/plugins/cases/server/services/connector_mappings/index.ts:15](https://github.com/elastic/kibana/blob/06b0f975f60/x-pack/plugins/cases/server/services/connector_mappings/index.ts#L15)
