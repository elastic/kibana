[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_\_internalNamespace](../modules/client.__internalNamespace.md) / IUsageCounter

# Interface: IUsageCounter

[client](../modules/client.md).[__internalNamespace](../modules/client.__internalNamespace.md).IUsageCounter

Usage Counter allows to keep track of any events that occur.
By calling [IUsageCounter.incrementCounter](client.__internalNamespace.IUsageCounter.md#incrementcounter) devs can notify this
API whenever the event happens.

## Table of contents

### Methods

- [incrementCounter](client.__internalNamespace.IUsageCounter.md#incrementcounter)

## Methods

### incrementCounter

▸ **incrementCounter**(`params`): `void`

Notifies the counter about a new event happening so it can increase the count internally.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `params` | [`IncrementCounterParams`](client.__internalNamespace.IncrementCounterParams.md) | [IncrementCounterParams](client.__internalNamespace.IncrementCounterParams.md) |

#### Returns

`void`

#### Defined in

src/plugins/usage_collection/target/types/server/usage_counters/usage_counter.d.ts:33
