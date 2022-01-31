[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_\_internalNamespace](../modules/client.__internalNamespace.md) / SavedObjectsCollectMultiNamespaceReferencesObject

# Interface: SavedObjectsCollectMultiNamespaceReferencesObject

[client](../modules/client.md).[__internalNamespace](../modules/client.__internalNamespace.md).SavedObjectsCollectMultiNamespaceReferencesObject

An object to collect references for. It must be a multi-namespace type (in other words, the object type must be registered with the
`namespaceType: 'multiple'` or `namespaceType: 'multiple-isolated'` option).

Note: if options.purpose is 'updateObjectsSpaces', it must be a shareable type (in other words, the object type must be registered with
the `namespaceType: 'multiple'`).

## Table of contents

### Properties

- [id](client.__internalNamespace.SavedObjectsCollectMultiNamespaceReferencesObject.md#id)
- [type](client.__internalNamespace.SavedObjectsCollectMultiNamespaceReferencesObject.md#type)

## Properties

### id

• **id**: `string`

#### Defined in

src/core/target/types/server/saved_objects/service/lib/collect_multi_namespace_references.d.ts:24

___

### type

• **type**: `string`

#### Defined in

src/core/target/types/server/saved_objects/service/lib/collect_multi_namespace_references.d.ts:25
