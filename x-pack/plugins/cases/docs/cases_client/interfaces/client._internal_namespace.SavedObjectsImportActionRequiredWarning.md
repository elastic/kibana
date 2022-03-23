[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_internal\_namespace](../modules/client._internal_namespace.md) / SavedObjectsImportActionRequiredWarning

# Interface: SavedObjectsImportActionRequiredWarning

[client](../modules/client.md).[_internal_namespace](../modules/client._internal_namespace.md).SavedObjectsImportActionRequiredWarning

A warning meant to notify that a specific user action is required to finalize the import
of some type of object.

**`remark`** The `actionUrl` must be a path relative to the basePath, and not include it.

## Table of contents

### Properties

- [actionPath](client._internal_namespace.SavedObjectsImportActionRequiredWarning.md#actionpath)
- [buttonLabel](client._internal_namespace.SavedObjectsImportActionRequiredWarning.md#buttonlabel)
- [message](client._internal_namespace.SavedObjectsImportActionRequiredWarning.md#message)
- [type](client._internal_namespace.SavedObjectsImportActionRequiredWarning.md#type)

## Properties

### actionPath

• **actionPath**: `string`

The path (without the basePath) that the user should be redirect to address this warning.

#### Defined in

src/core/target/types/server/saved_objects/import/types.d.ts:191

___

### buttonLabel

• `Optional` **buttonLabel**: `string`

An optional label to use for the link button. If unspecified, a default label will be used.

#### Defined in

src/core/target/types/server/saved_objects/import/types.d.ts:193

___

### message

• **message**: `string`

The translated message to display to the user.

#### Defined in

src/core/target/types/server/saved_objects/import/types.d.ts:189

___

### type

• **type**: ``"action_required"``

#### Defined in

src/core/target/types/server/saved_objects/import/types.d.ts:187
