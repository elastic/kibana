[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_internal\_namespace](../modules/client._internal_namespace.md) / PostConnectorMappingsArgs

# Interface: PostConnectorMappingsArgs

[client](../modules/client.md).[_internal_namespace](../modules/client._internal_namespace.md).PostConnectorMappingsArgs

## Hierarchy

- [`ClientArgs`](client._internal_namespace.ClientArgs-2.md)

  ↳ **`PostConnectorMappingsArgs`**

## Table of contents

### Properties

- [attributes](client._internal_namespace.PostConnectorMappingsArgs.md#attributes)
- [references](client._internal_namespace.PostConnectorMappingsArgs.md#references)
- [unsecuredSavedObjectsClient](client._internal_namespace.PostConnectorMappingsArgs.md#unsecuredsavedobjectsclient)

## Properties

### attributes

• **attributes**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `mappings` | { action\_type: "append" \| "nothing" \| "overwrite"; source: "description" \| "title" \| "comments"; target: string; }[] |
| `owner` | `string` |

#### Defined in

[x-pack/plugins/cases/server/services/connector_mappings/index.ts:22](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/services/connector_mappings/index.ts#L22)

___

### references

• **references**: [`SavedObjectReference`](client._internal_namespace.SavedObjectReference.md)[]

#### Defined in

[x-pack/plugins/cases/server/services/connector_mappings/index.ts:23](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/services/connector_mappings/index.ts#L23)

___

### unsecuredSavedObjectsClient

• **unsecuredSavedObjectsClient**: [`SavedObjectsClientContract`](../modules/client._internal_namespace.md#savedobjectsclientcontract)

#### Inherited from

[ClientArgs](client._internal_namespace.ClientArgs-2.md).[unsecuredSavedObjectsClient](client._internal_namespace.ClientArgs-2.md#unsecuredsavedobjectsclient)

#### Defined in

[x-pack/plugins/cases/server/services/connector_mappings/index.ts:15](https://github.com/elastic/kibana/blob/c427bf270ae/x-pack/plugins/cases/server/services/connector_mappings/index.ts#L15)
