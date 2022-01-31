[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_\_internalNamespace](../modules/client.__internalNamespace.md) / Space

# Interface: Space

[client](../modules/client.md).[__internalNamespace](../modules/client.__internalNamespace.md).Space

A Space.

## Hierarchy

- **`Space`**

  ↳ [`GetSpaceResult`](client.__internalNamespace.GetSpaceResult.md)

## Table of contents

### Properties

- [\_reserved](client.__internalNamespace.Space.md#_reserved)
- [color](client.__internalNamespace.Space.md#color)
- [description](client.__internalNamespace.Space.md#description)
- [disabledFeatures](client.__internalNamespace.Space.md#disabledfeatures)
- [id](client.__internalNamespace.Space.md#id)
- [imageUrl](client.__internalNamespace.Space.md#imageurl)
- [initials](client.__internalNamespace.Space.md#initials)
- [name](client.__internalNamespace.Space.md#name)

## Properties

### \_reserved

• `Optional` `Private` **\_reserved**: `boolean`

Indicates that this space is reserved (system controlled).
Reserved spaces cannot be created or deleted by end-users.

#### Defined in

x-pack/plugins/spaces/target/types/common/types.d.ts:46

___

### color

• `Optional` **color**: `string`

Optional color (hex code) for this space.
If neither `color` nor `imageUrl` is specified, then a color will be automatically generated.

#### Defined in

x-pack/plugins/spaces/target/types/common/types.d.ts:24

___

### description

• `Optional` **description**: `string`

Optional description for this space.

#### Defined in

x-pack/plugins/spaces/target/types/common/types.d.ts:19

___

### disabledFeatures

• **disabledFeatures**: `string`[]

The set of feature ids that should be hidden within this space.

#### Defined in

x-pack/plugins/spaces/target/types/common/types.d.ts:40

___

### id

• **id**: `string`

The unique identifier for this space.
The id becomes part of the "URL Identifier" of the space.

Example: an id of `marketing` would result in the URL identifier of `/s/marketing`.

#### Defined in

x-pack/plugins/spaces/target/types/common/types.d.ts:11

___

### imageUrl

• `Optional` **imageUrl**: `string`

Optional base-64 encoded data image url to show as this space's avatar.
This setting takes precedence over any configured `color` or `initials`.

#### Defined in

x-pack/plugins/spaces/target/types/common/types.d.ts:36

___

### initials

• `Optional` **initials**: `string`

Optional display initials for this space's avatar. Supports a maximum of 2 characters.
If initials are not provided, then they will be derived from the space name automatically.

Initials are not displayed if an `imageUrl` has been specified.

#### Defined in

x-pack/plugins/spaces/target/types/common/types.d.ts:31

___

### name

• **name**: `string`

Display name for this space.

#### Defined in

x-pack/plugins/spaces/target/types/common/types.d.ts:15
