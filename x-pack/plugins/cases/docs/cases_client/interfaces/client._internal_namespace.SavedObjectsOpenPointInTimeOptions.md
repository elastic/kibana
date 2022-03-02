[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_internal\_namespace](../modules/client._internal_namespace.md) / SavedObjectsOpenPointInTimeOptions

# Interface: SavedObjectsOpenPointInTimeOptions

[client](../modules/client.md).[_internal_namespace](../modules/client._internal_namespace.md).SavedObjectsOpenPointInTimeOptions

## Table of contents

### Properties

- [keepAlive](client._internal_namespace.SavedObjectsOpenPointInTimeOptions.md#keepalive)
- [namespaces](client._internal_namespace.SavedObjectsOpenPointInTimeOptions.md#namespaces)
- [preference](client._internal_namespace.SavedObjectsOpenPointInTimeOptions.md#preference)

## Properties

### keepAlive

• `Optional` **keepAlive**: `string`

Optionally specify how long ES should keep the PIT alive until the next request. Defaults to `5m`.

#### Defined in

src/core/target/types/server/saved_objects/service/saved_objects_client.d.ts:320

___

### namespaces

• `Optional` **namespaces**: `string`[]

An optional list of namespaces to be used when opening the PIT.

When the spaces plugin is enabled:
 - this will default to the user's current space (as determined by the URL)
 - if specified, the user's current space will be ignored
 - `['*']` will search across all available spaces

#### Defined in

src/core/target/types/server/saved_objects/service/saved_objects_client.d.ts:333

___

### preference

• `Optional` **preference**: `string`

An optional ES preference value to be used for the query.

#### Defined in

src/core/target/types/server/saved_objects/service/saved_objects_client.d.ts:324
