[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_\_internalNamespace](../modules/client.__internalNamespace.md) / IncrementCounterParams

# Interface: IncrementCounterParams

[client](../modules/client.md).[__internalNamespace](../modules/client.__internalNamespace.md).IncrementCounterParams

Details about the counter to be incremented

## Table of contents

### Properties

- [counterName](client.__internalNamespace.IncrementCounterParams.md#countername)
- [counterType](client.__internalNamespace.IncrementCounterParams.md#countertype)
- [incrementBy](client.__internalNamespace.IncrementCounterParams.md#incrementby)

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
