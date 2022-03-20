[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_internal\_namespace](../modules/client._internal_namespace.md) / SavedObjectsUpdateObjectsSpacesResponseObject

# Interface: SavedObjectsUpdateObjectsSpacesResponseObject

[client](../modules/client.md).[_internal_namespace](../modules/client._internal_namespace.md).SavedObjectsUpdateObjectsSpacesResponseObject

Details about a specific object's update result.

## Table of contents

### Properties

- [error](client._internal_namespace.SavedObjectsUpdateObjectsSpacesResponseObject.md#error)
- [id](client._internal_namespace.SavedObjectsUpdateObjectsSpacesResponseObject.md#id)
- [spaces](client._internal_namespace.SavedObjectsUpdateObjectsSpacesResponseObject.md#spaces)
- [type](client._internal_namespace.SavedObjectsUpdateObjectsSpacesResponseObject.md#type)

## Properties

### error

• `Optional` **error**: [`SavedObjectError`](client._internal_namespace.SavedObjectError.md)

Included if there was an error updating this object's spaces

#### Defined in

src/core/target/types/server/saved_objects/service/lib/update_objects_spaces.d.ts:60

___

### id

• **id**: `string`

The ID of the referenced object

#### Defined in

src/core/target/types/server/saved_objects/service/lib/update_objects_spaces.d.ts:56

___

### spaces

• **spaces**: `string`[]

The space(s) that the referenced object exists in

#### Defined in

src/core/target/types/server/saved_objects/service/lib/update_objects_spaces.d.ts:58

___

### type

• **type**: `string`

The type of the referenced object

#### Defined in

src/core/target/types/server/saved_objects/service/lib/update_objects_spaces.d.ts:54
