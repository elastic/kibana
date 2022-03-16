[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_internal\_namespace](../modules/client._internal_namespace.md) / IEventLogger

# Interface: IEventLogger

[client](../modules/client.md).[_internal_namespace](../modules/client._internal_namespace.md).IEventLogger

## Table of contents

### Methods

- [logEvent](client._internal_namespace.IEventLogger.md#logevent)
- [startTiming](client._internal_namespace.IEventLogger.md#starttiming)
- [stopTiming](client._internal_namespace.IEventLogger.md#stoptiming)

## Methods

### logEvent

▸ **logEvent**(`properties`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `properties` | [`IEvent`](../modules/client._internal_namespace.md#ievent) |

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
| `event` | [`IEvent`](../modules/client._internal_namespace.md#ievent) |

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
| `event` | [`IEvent`](../modules/client._internal_namespace.md#ievent) |

#### Returns

`void`

#### Defined in

x-pack/plugins/event_log/target/types/server/types.d.ts:36
