[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_\_internalNamespace](../modules/client.__internalNamespace.md) / SavedObjectsTypeMappingDefinition

# Interface: SavedObjectsTypeMappingDefinition

[client](../modules/client.md).[__internalNamespace](../modules/client.__internalNamespace.md).SavedObjectsTypeMappingDefinition

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

- [dynamic](client.__internalNamespace.SavedObjectsTypeMappingDefinition.md#dynamic)
- [properties](client.__internalNamespace.SavedObjectsTypeMappingDefinition.md#properties)

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

• **properties**: [`SavedObjectsMappingProperties`](client.__internalNamespace.SavedObjectsMappingProperties.md)

The underlying properties of the type mapping

#### Defined in

src/core/target/types/server/saved_objects/mappings/types.d.ts:35
