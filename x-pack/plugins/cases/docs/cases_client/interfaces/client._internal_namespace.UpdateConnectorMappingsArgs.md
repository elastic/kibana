[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_internal\_namespace](../modules/client._internal_namespace.md) / UpdateConnectorMappingsArgs

# Interface: UpdateConnectorMappingsArgs

[client](../modules/client.md).[_internal_namespace](../modules/client._internal_namespace.md).UpdateConnectorMappingsArgs

## Hierarchy

- [`ClientArgs`](client._internal_namespace.ClientArgs-2.md)

  ↳ **`UpdateConnectorMappingsArgs`**

## Table of contents

### Properties

- [attributes](client._internal_namespace.UpdateConnectorMappingsArgs.md#attributes)
- [mappingId](client._internal_namespace.UpdateConnectorMappingsArgs.md#mappingid)
- [references](client._internal_namespace.UpdateConnectorMappingsArgs.md#references)
- [unsecuredSavedObjectsClient](client._internal_namespace.UpdateConnectorMappingsArgs.md#unsecuredsavedobjectsclient)

## Properties

### attributes

• **attributes**: `Partial`<{ `mappings`: { action\_type: "append" \| "nothing" \| "overwrite"; source: "description" \| "title" \| "comments"; target: string; }[] ; `owner`: `string` = rt.string }\>

#### Defined in

[x-pack/plugins/cases/server/services/connector_mappings/index.ts:28](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/services/connector_mappings/index.ts#L28)

___

### mappingId

• **mappingId**: `string`

#### Defined in

[x-pack/plugins/cases/server/services/connector_mappings/index.ts:27](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/services/connector_mappings/index.ts#L27)

___

### references

• **references**: [`SavedObjectReference`](client._internal_namespace.SavedObjectReference.md)[]

#### Defined in

[x-pack/plugins/cases/server/services/connector_mappings/index.ts:29](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/services/connector_mappings/index.ts#L29)

___

### unsecuredSavedObjectsClient

• **unsecuredSavedObjectsClient**: [`SavedObjectsClientContract`](../modules/client._internal_namespace.md#savedobjectsclientcontract)

#### Inherited from

[ClientArgs](client._internal_namespace.ClientArgs-2.md).[unsecuredSavedObjectsClient](client._internal_namespace.ClientArgs-2.md#unsecuredsavedobjectsclient)

#### Defined in

[x-pack/plugins/cases/server/services/connector_mappings/index.ts:15](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/services/connector_mappings/index.ts#L15)
