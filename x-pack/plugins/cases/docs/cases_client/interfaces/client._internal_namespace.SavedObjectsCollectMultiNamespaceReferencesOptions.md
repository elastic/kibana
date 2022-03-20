[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_internal\_namespace](../modules/client._internal_namespace.md) / SavedObjectsCollectMultiNamespaceReferencesOptions

# Interface: SavedObjectsCollectMultiNamespaceReferencesOptions

[client](../modules/client.md).[_internal_namespace](../modules/client._internal_namespace.md).SavedObjectsCollectMultiNamespaceReferencesOptions

Options for collecting references.

## Hierarchy

- [`SavedObjectsBaseOptions`](client._internal_namespace.SavedObjectsBaseOptions.md)

  ↳ **`SavedObjectsCollectMultiNamespaceReferencesOptions`**

## Table of contents

### Properties

- [namespace](client._internal_namespace.SavedObjectsCollectMultiNamespaceReferencesOptions.md#namespace)
- [purpose](client._internal_namespace.SavedObjectsCollectMultiNamespaceReferencesOptions.md#purpose)

## Properties

### namespace

• `Optional` **namespace**: `string`

Specify the namespace for this operation

#### Inherited from

[SavedObjectsBaseOptions](client._internal_namespace.SavedObjectsBaseOptions.md).[namespace](client._internal_namespace.SavedObjectsBaseOptions.md#namespace)

#### Defined in

src/core/target/types/server/saved_objects/types.d.ts:126

___

### purpose

• `Optional` **purpose**: ``"collectMultiNamespaceReferences"`` \| ``"updateObjectsSpaces"``

Optional purpose used to determine filtering and authorization checks; default is 'collectMultiNamespaceReferences'

#### Defined in

src/core/target/types/server/saved_objects/service/lib/collect_multi_namespace_references.d.ts:34
