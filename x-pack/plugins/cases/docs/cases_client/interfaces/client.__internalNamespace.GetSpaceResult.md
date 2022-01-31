[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_\_internalNamespace](../modules/client.__internalNamespace.md) / GetSpaceResult

# Interface: GetSpaceResult

[client](../modules/client.md).[__internalNamespace](../modules/client.__internalNamespace.md).GetSpaceResult

Response format when querying for spaces.

## Hierarchy

- [`Space`](client.__internalNamespace.Space.md)

  ↳ **`GetSpaceResult`**

## Table of contents

### Properties

- [\_reserved](client.__internalNamespace.GetSpaceResult.md#_reserved)
- [authorizedPurposes](client.__internalNamespace.GetSpaceResult.md#authorizedpurposes)
- [color](client.__internalNamespace.GetSpaceResult.md#color)
- [description](client.__internalNamespace.GetSpaceResult.md#description)
- [disabledFeatures](client.__internalNamespace.GetSpaceResult.md#disabledfeatures)
- [id](client.__internalNamespace.GetSpaceResult.md#id)
- [imageUrl](client.__internalNamespace.GetSpaceResult.md#imageurl)
- [initials](client.__internalNamespace.GetSpaceResult.md#initials)
- [name](client.__internalNamespace.GetSpaceResult.md#name)

## Properties

### \_reserved

• `Optional` `Private` **\_reserved**: `boolean`

Indicates that this space is reserved (system controlled).
Reserved spaces cannot be created or deleted by end-users.

#### Inherited from

[Space](client.__internalNamespace.Space.md).[_reserved](client.__internalNamespace.Space.md#_reserved)

#### Defined in

x-pack/plugins/spaces/target/types/common/types.d.ts:46

___

### authorizedPurposes

• `Optional` **authorizedPurposes**: `Record`<[`GetAllSpacesPurpose`](../modules/client.__internalNamespace.md#getallspacespurpose), `boolean`\>

A set of flags indicating which purposes the user is authorized for.

#### Defined in

x-pack/plugins/spaces/target/types/common/types.d.ts:82

___

### color

• `Optional` **color**: `string`

Optional color (hex code) for this space.
If neither `color` nor `imageUrl` is specified, then a color will be automatically generated.

#### Inherited from

[Space](client.__internalNamespace.Space.md).[color](client.__internalNamespace.Space.md#color)

#### Defined in

x-pack/plugins/spaces/target/types/common/types.d.ts:24

___

### description

• `Optional` **description**: `string`

Optional description for this space.

#### Inherited from

[Space](client.__internalNamespace.Space.md).[description](client.__internalNamespace.Space.md#description)

#### Defined in

x-pack/plugins/spaces/target/types/common/types.d.ts:19

___

### disabledFeatures

• **disabledFeatures**: `string`[]

The set of feature ids that should be hidden within this space.

#### Inherited from

[Space](client.__internalNamespace.Space.md).[disabledFeatures](client.__internalNamespace.Space.md#disabledfeatures)

#### Defined in

x-pack/plugins/spaces/target/types/common/types.d.ts:40

___

### id

• **id**: `string`

The unique identifier for this space.
The id becomes part of the "URL Identifier" of the space.

Example: an id of `marketing` would result in the URL identifier of `/s/marketing`.

#### Inherited from

[Space](client.__internalNamespace.Space.md).[id](client.__internalNamespace.Space.md#id)

#### Defined in

x-pack/plugins/spaces/target/types/common/types.d.ts:11

___

### imageUrl

• `Optional` **imageUrl**: `string`

Optional base-64 encoded data image url to show as this space's avatar.
This setting takes precedence over any configured `color` or `initials`.

#### Inherited from

[Space](client.__internalNamespace.Space.md).[imageUrl](client.__internalNamespace.Space.md#imageurl)

#### Defined in

x-pack/plugins/spaces/target/types/common/types.d.ts:36

___

### initials

• `Optional` **initials**: `string`

Optional display initials for this space's avatar. Supports a maximum of 2 characters.
If initials are not provided, then they will be derived from the space name automatically.

Initials are not displayed if an `imageUrl` has been specified.

#### Inherited from

[Space](client.__internalNamespace.Space.md).[initials](client.__internalNamespace.Space.md#initials)

#### Defined in

x-pack/plugins/spaces/target/types/common/types.d.ts:31

___

### name

• **name**: `string`

Display name for this space.

#### Inherited from

[Space](client.__internalNamespace.Space.md).[name](client.__internalNamespace.Space.md#name)

#### Defined in

x-pack/plugins/spaces/target/types/common/types.d.ts:15
