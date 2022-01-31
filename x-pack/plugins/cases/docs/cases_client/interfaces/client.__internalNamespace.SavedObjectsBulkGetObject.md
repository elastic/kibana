[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_\_internalNamespace](../modules/client.__internalNamespace.md) / SavedObjectsBulkGetObject

# Interface: SavedObjectsBulkGetObject

[client](../modules/client.md).[__internalNamespace](../modules/client.__internalNamespace.md).SavedObjectsBulkGetObject

## Table of contents

### Properties

- [fields](client.__internalNamespace.SavedObjectsBulkGetObject.md#fields)
- [id](client.__internalNamespace.SavedObjectsBulkGetObject.md#id)
- [namespaces](client.__internalNamespace.SavedObjectsBulkGetObject.md#namespaces)
- [type](client.__internalNamespace.SavedObjectsBulkGetObject.md#type)

## Properties

### fields

• `Optional` **fields**: `string`[]

SavedObject fields to include in the response

#### Defined in

src/core/target/types/server/saved_objects/service/saved_objects_client.d.ts:239

___

### id

• **id**: `string`

#### Defined in

src/core/target/types/server/saved_objects/service/saved_objects_client.d.ts:236

___

### namespaces

• `Optional` **namespaces**: `string`[]

Optional namespace(s) for the object to be retrieved in. If this is defined, it will supersede the namespace ID that is in the
top-level options.

* For shareable object types (registered with `namespaceType: 'multiple'`): this option can be used to specify one or more spaces,
  including the "All spaces" identifier (`'*'`).
* For isolated object types (registered with `namespaceType: 'single'` or `namespaceType: 'multiple-isolated'`): this option can only
  be used to specify a single space, and the "All spaces" identifier (`'*'`) is not allowed.
* For global object types (registered with `namespaceType: 'agnostic'`): this option cannot be used.

#### Defined in

src/core/target/types/server/saved_objects/service/saved_objects_client.d.ts:250

___

### type

• **type**: `string`

#### Defined in

src/core/target/types/server/saved_objects/service/saved_objects_client.d.ts:237
