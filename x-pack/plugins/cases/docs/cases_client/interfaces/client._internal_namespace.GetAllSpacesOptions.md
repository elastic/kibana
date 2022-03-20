[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_internal\_namespace](../modules/client._internal_namespace.md) / GetAllSpacesOptions

# Interface: GetAllSpacesOptions

[client](../modules/client.md).[_internal_namespace](../modules/client._internal_namespace.md).GetAllSpacesOptions

Controls how spaces are retrieved.

## Table of contents

### Properties

- [includeAuthorizedPurposes](client._internal_namespace.GetAllSpacesOptions.md#includeauthorizedpurposes)
- [purpose](client._internal_namespace.GetAllSpacesOptions.md#purpose)

## Properties

### includeAuthorizedPurposes

• `Optional` **includeAuthorizedPurposes**: `boolean`

Set to true to return a set of flags indicating which purposes the user is authorized for.

**`see`** GetAllSpacesPurpose

#### Defined in

x-pack/plugins/spaces/target/types/common/types.d.ts:65

___

### purpose

• `Optional` **purpose**: [`GetAllSpacesPurpose`](../modules/client._internal_namespace.md#getallspacespurpose)

An optional purpose describing how the set of spaces will be used.
The default purpose (`any`) will retrieve all spaces the user is authorized to see,
whereas a more specific purpose will retrieve all spaces the user is authorized to perform a specific action within.

**`see`** GetAllSpacesPurpose

#### Defined in

x-pack/plugins/spaces/target/types/common/types.d.ts:59
