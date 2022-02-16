[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_internal\_namespace](../modules/client._internal_namespace.md) / SavedObjectReferenceWithContext

# Interface: SavedObjectReferenceWithContext

[client](../modules/client.md).[_internal_namespace](../modules/client._internal_namespace.md).SavedObjectReferenceWithContext

A returned input object or one of its references, with additional context.

## Table of contents

### Properties

- [id](client._internal_namespace.SavedObjectReferenceWithContext.md#id)
- [inboundReferences](client._internal_namespace.SavedObjectReferenceWithContext.md#inboundreferences)
- [isMissing](client._internal_namespace.SavedObjectReferenceWithContext.md#ismissing)
- [spaces](client._internal_namespace.SavedObjectReferenceWithContext.md#spaces)
- [spacesWithMatchingAliases](client._internal_namespace.SavedObjectReferenceWithContext.md#spaceswithmatchingaliases)
- [type](client._internal_namespace.SavedObjectReferenceWithContext.md#type)

## Properties

### id

• **id**: `string`

The ID of the referenced object

#### Defined in

src/core/target/types/server/saved_objects/service/lib/collect_multi_namespace_references.d.ts:45

___

### inboundReferences

• **inboundReferences**: { `id`: `string` ; `name`: `string` ; `type`: `string`  }[]

References to this object; note that this does not contain _all inbound references everywhere for this object_, it only contains
inbound references for the scope of this operation

#### Defined in

src/core/target/types/server/saved_objects/service/lib/collect_multi_namespace_references.d.ts:52

___

### isMissing

• `Optional` **isMissing**: `boolean`

Whether or not this object or reference is missing

#### Defined in

src/core/target/types/server/saved_objects/service/lib/collect_multi_namespace_references.d.ts:61

___

### spaces

• **spaces**: `string`[]

The space(s) that the referenced object exists in

#### Defined in

src/core/target/types/server/saved_objects/service/lib/collect_multi_namespace_references.d.ts:47

___

### spacesWithMatchingAliases

• `Optional` **spacesWithMatchingAliases**: `string`[]

The space(s) that legacy URL aliases matching this type/id exist in

#### Defined in

src/core/target/types/server/saved_objects/service/lib/collect_multi_namespace_references.d.ts:63

___

### type

• **type**: `string`

The type of the referenced object

#### Defined in

src/core/target/types/server/saved_objects/service/lib/collect_multi_namespace_references.d.ts:43
