[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_\_internalNamespace](../modules/client.__internalNamespace.md) / SavedObjectsCollectMultiNamespaceReferencesOptions

# Interface: SavedObjectsCollectMultiNamespaceReferencesOptions

[client](../modules/client.md).[__internalNamespace](../modules/client.__internalNamespace.md).SavedObjectsCollectMultiNamespaceReferencesOptions

Options for collecting references.

## Hierarchy

- [`SavedObjectsBaseOptions`](client.__internalNamespace.SavedObjectsBaseOptions.md)

  ↳ **`SavedObjectsCollectMultiNamespaceReferencesOptions`**

## Table of contents

### Properties

- [namespace](client.__internalNamespace.SavedObjectsCollectMultiNamespaceReferencesOptions.md#namespace)
- [purpose](client.__internalNamespace.SavedObjectsCollectMultiNamespaceReferencesOptions.md#purpose)

## Properties

### namespace

• `Optional` **namespace**: `string`

Specify the namespace for this operation

#### Inherited from

[SavedObjectsBaseOptions](client.__internalNamespace.SavedObjectsBaseOptions.md).[namespace](client.__internalNamespace.SavedObjectsBaseOptions.md#namespace)

#### Defined in

src/core/target/types/server/saved_objects/types.d.ts:126

___

### purpose

• `Optional` **purpose**: ``"collectMultiNamespaceReferences"`` \| ``"updateObjectsSpaces"``

Optional purpose used to determine filtering and authorization checks; default is 'collectMultiNamespaceReferences'

#### Defined in

src/core/target/types/server/saved_objects/service/lib/collect_multi_namespace_references.d.ts:34
