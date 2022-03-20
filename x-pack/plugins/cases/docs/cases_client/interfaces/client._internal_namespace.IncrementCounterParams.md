[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_internal\_namespace](../modules/client._internal_namespace.md) / IncrementCounterParams

# Interface: IncrementCounterParams

[client](../modules/client.md).[_internal_namespace](../modules/client._internal_namespace.md).IncrementCounterParams

Details about the counter to be incremented

## Table of contents

### Properties

- [counterName](client._internal_namespace.IncrementCounterParams.md#countername)
- [counterType](client._internal_namespace.IncrementCounterParams.md#countertype)
- [incrementBy](client._internal_namespace.IncrementCounterParams.md#incrementby)

## Properties

### counterName

• **counterName**: `string`

The name of the counter

#### Defined in

src/plugins/usage_collection/target/types/server/usage_counters/usage_counter.d.ts:17

___

### counterType

• `Optional` **counterType**: `string`

The counter type ("count" by default)

#### Defined in

src/plugins/usage_collection/target/types/server/usage_counters/usage_counter.d.ts:19

___

### incrementBy

• `Optional` **incrementBy**: `number`

Increment the counter by this number (1 if not specified)

#### Defined in

src/plugins/usage_collection/target/types/server/usage_counters/usage_counter.d.ts:21
