[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_internal\_namespace](../modules/client._internal_namespace.md) / SavedObjectsResolveResponse

# Interface: SavedObjectsResolveResponse<T\>

[client](../modules/client.md).[_internal_namespace](../modules/client._internal_namespace.md).SavedObjectsResolveResponse

## Type parameters

| Name | Type |
| :------ | :------ |
| `T` | `unknown` |

## Table of contents

### Properties

- [alias\_target\_id](client._internal_namespace.SavedObjectsResolveResponse.md#alias_target_id)
- [outcome](client._internal_namespace.SavedObjectsResolveResponse.md#outcome)
- [saved\_object](client._internal_namespace.SavedObjectsResolveResponse.md#saved_object)

## Properties

### alias\_target\_id

• `Optional` **alias\_target\_id**: `string`

The ID of the object that the legacy URL alias points to. This is only defined when the outcome is `'aliasMatch'` or `'conflict'`.

#### Defined in

src/core/target/types/server/saved_objects/service/saved_objects_client.d.ts:311

___

### outcome

• **outcome**: ``"exactMatch"`` \| ``"aliasMatch"`` \| ``"conflict"``

The outcome for a successful `resolve` call is one of the following values:

 * `'exactMatch'` -- One document exactly matched the given ID.
 * `'aliasMatch'` -- One document with a legacy URL alias matched the given ID; in this case the `saved_object.id` field is different
   than the given ID.
 * `'conflict'` -- Two documents matched the given ID, one was an exact match and another with a legacy URL alias; in this case the
   `saved_object` object is the exact match, and the `saved_object.id` field is the same as the given ID.

#### Defined in

src/core/target/types/server/saved_objects/service/saved_objects_client.d.ts:307

___

### saved\_object

• **saved\_object**: [`SavedObject`](client._internal_namespace.SavedObject.md)<`T`\>

The saved object that was found.

#### Defined in

src/core/target/types/server/saved_objects/service/saved_objects_client.d.ts:297
