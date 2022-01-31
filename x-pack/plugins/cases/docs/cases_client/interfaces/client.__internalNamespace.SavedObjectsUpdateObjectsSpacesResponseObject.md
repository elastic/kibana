[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_\_internalNamespace](../modules/client.__internalNamespace.md) / SavedObjectsUpdateObjectsSpacesResponseObject

# Interface: SavedObjectsUpdateObjectsSpacesResponseObject

[client](../modules/client.md).[__internalNamespace](../modules/client.__internalNamespace.md).SavedObjectsUpdateObjectsSpacesResponseObject

Details about a specific object's update result.

## Table of contents

### Properties

- [error](client.__internalNamespace.SavedObjectsUpdateObjectsSpacesResponseObject.md#error)
- [id](client.__internalNamespace.SavedObjectsUpdateObjectsSpacesResponseObject.md#id)
- [spaces](client.__internalNamespace.SavedObjectsUpdateObjectsSpacesResponseObject.md#spaces)
- [type](client.__internalNamespace.SavedObjectsUpdateObjectsSpacesResponseObject.md#type)

## Properties

### error

• `Optional` **error**: [`SavedObjectError`](client.__internalNamespace.SavedObjectError.md)

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
