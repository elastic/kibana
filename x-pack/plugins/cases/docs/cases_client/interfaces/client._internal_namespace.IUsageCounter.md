[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_internal\_namespace](../modules/client._internal_namespace.md) / IUsageCounter

# Interface: IUsageCounter

[client](../modules/client.md).[_internal_namespace](../modules/client._internal_namespace.md).IUsageCounter

Usage Counter allows to keep track of any events that occur.
By calling [IUsageCounter.incrementCounter](client._internal_namespace.IUsageCounter.md#incrementcounter) devs can notify this
API whenever the event happens.

## Table of contents

### Methods

- [incrementCounter](client._internal_namespace.IUsageCounter.md#incrementcounter)

## Methods

### incrementCounter

▸ **incrementCounter**(`params`): `void`

Notifies the counter about a new event happening so it can increase the count internally.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `params` | [`IncrementCounterParams`](client._internal_namespace.IncrementCounterParams.md) | [IncrementCounterParams](client._internal_namespace.IncrementCounterParams.md) |

#### Returns

`void`

#### Defined in

src/plugins/usage_collection/target/types/server/usage_counters/usage_counter.d.ts:33
