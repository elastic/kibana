[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_internal\_namespace](../modules/client._internal_namespace.md) / SavedObjectsUpdateObjectsSpacesObject

# Interface: SavedObjectsUpdateObjectsSpacesObject

[client](../modules/client.md).[_internal_namespace](../modules/client._internal_namespace.md).SavedObjectsUpdateObjectsSpacesObject

An object that should have its spaces updated.

## Table of contents

### Properties

- [id](client._internal_namespace.SavedObjectsUpdateObjectsSpacesObject.md#id)
- [spaces](client._internal_namespace.SavedObjectsUpdateObjectsSpacesObject.md#spaces)
- [type](client._internal_namespace.SavedObjectsUpdateObjectsSpacesObject.md#type)
- [version](client._internal_namespace.SavedObjectsUpdateObjectsSpacesObject.md#version)

## Properties

### id

• **id**: `string`

The type of the object to update

#### Defined in

src/core/target/types/server/saved_objects/service/lib/update_objects_spaces.d.ts:14

___

### spaces

• `Optional` **spaces**: `string`[]

The space(s) that the object to update currently exists in. This is only intended to be used by SOC wrappers.

**`internal`**

#### Defined in

src/core/target/types/server/saved_objects/service/lib/update_objects_spaces.d.ts:22

___

### type

• **type**: `string`

The ID of the object to update

#### Defined in

src/core/target/types/server/saved_objects/service/lib/update_objects_spaces.d.ts:16

___

### version

• `Optional` **version**: `string`

The version of the object to update; this is used for optimistic concurrency control. This is only intended to be used by SOC wrappers.

**`internal`**

#### Defined in

src/core/target/types/server/saved_objects/service/lib/update_objects_spaces.d.ts:28
