[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_internal\_namespace](../modules/client._internal_namespace.md) / SavedObjectsTypeMappingDefinition

# Interface: SavedObjectsTypeMappingDefinition

[client](../modules/client.md).[_internal_namespace](../modules/client._internal_namespace.md).SavedObjectsTypeMappingDefinition

Describe a saved object type mapping.

**`example`**
```ts
const typeDefinition: SavedObjectsTypeMappingDefinition = {
  properties: {
    enabled: {
      type: "boolean"
    },
    sendUsageFrom: {
      ignore_above: 256,
      type: "keyword"
    },
    lastReported: {
      type: "date"
    },
    lastVersionChecked: {
      ignore_above: 256,
      type: "keyword"
    },
  }
}
```

## Table of contents

### Properties

- [dynamic](client._internal_namespace.SavedObjectsTypeMappingDefinition.md#dynamic)
- [properties](client._internal_namespace.SavedObjectsTypeMappingDefinition.md#properties)

## Properties

### dynamic

• `Optional` **dynamic**: ``false`` \| ``"strict"``

The dynamic property of the mapping, either `false` or `'strict'`. If
unspecified `dynamic: 'strict'` will be inherited from the top-level
index mappings.

#### Defined in

src/core/target/types/server/saved_objects/mappings/types.d.ts:33

___

### properties

• **properties**: [`SavedObjectsMappingProperties`](client._internal_namespace.SavedObjectsMappingProperties.md)

The underlying properties of the type mapping

#### Defined in

src/core/target/types/server/saved_objects/mappings/types.d.ts:35
