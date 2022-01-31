[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_\_internalNamespace](../modules/client.__internalNamespace.md) / IEventLogger

# Interface: IEventLogger

[client](../modules/client.md).[__internalNamespace](../modules/client.__internalNamespace.md).IEventLogger

## Table of contents

### Methods

- [logEvent](client.__internalNamespace.IEventLogger.md#logevent)
- [startTiming](client.__internalNamespace.IEventLogger.md#starttiming)
- [stopTiming](client.__internalNamespace.IEventLogger.md#stoptiming)

## Methods

### logEvent

▸ **logEvent**(`properties`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `properties` | [`IEvent`](../modules/client.__internalNamespace.md#ievent) |

#### Returns

`void`

#### Defined in

x-pack/plugins/event_log/target/types/server/types.d.ts:34

___

### startTiming

▸ **startTiming**(`event`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | [`IEvent`](../modules/client.__internalNamespace.md#ievent) |

#### Returns

`void`

#### Defined in

x-pack/plugins/event_log/target/types/server/types.d.ts:35

___

### stopTiming

▸ **stopTiming**(`event`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | [`IEvent`](../modules/client.__internalNamespace.md#ievent) |

#### Returns

`void`

#### Defined in

x-pack/plugins/event_log/target/types/server/types.d.ts:36
