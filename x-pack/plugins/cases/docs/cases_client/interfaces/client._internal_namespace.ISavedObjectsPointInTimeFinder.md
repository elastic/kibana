[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_internal\_namespace](../modules/client._internal_namespace.md) / ISavedObjectsPointInTimeFinder

# Interface: ISavedObjectsPointInTimeFinder<T, A\>

[client](../modules/client.md).[_internal_namespace](../modules/client._internal_namespace.md).ISavedObjectsPointInTimeFinder

## Type parameters

| Name |
| :------ |
| `T` |
| `A` |

## Table of contents

### Methods

- [close](client._internal_namespace.ISavedObjectsPointInTimeFinder.md#close)
- [find](client._internal_namespace.ISavedObjectsPointInTimeFinder.md#find)

## Methods

### close

▸ **close**(): `Promise`<`void`\>

Closes the Point-In-Time associated with this finder instance.

Once you have retrieved all of the results you need, it is recommended
to call `close()` to clean up the PIT and prevent Elasticsearch from
consuming resources unnecessarily. This is only required if you are
done iterating and have not yet paged through all of the results: the
PIT will automatically be closed for you once you reach the last page
of results, or if the underlying call to `find` fails for any reason.

#### Returns

`Promise`<`void`\>

#### Defined in

src/core/target/types/server/saved_objects/service/lib/point_in_time_finder.d.ts:43

___

### find

▸ **find**(): `AsyncGenerator`<[`SavedObjectsFindResponse`](client._internal_namespace.SavedObjectsFindResponse.md)<`T`, `A`\>, `any`, `unknown`\>

An async generator which wraps calls to `savedObjectsClient.find` and
iterates over multiple pages of results using `_pit` and `search_after`.
This will open a new Point-In-Time (PIT), and continue paging until a set
of results is received that's smaller than the designated `perPage` size.

#### Returns

`AsyncGenerator`<[`SavedObjectsFindResponse`](client._internal_namespace.SavedObjectsFindResponse.md)<`T`, `A`\>, `any`, `unknown`\>

#### Defined in

src/core/target/types/server/saved_objects/service/lib/point_in_time_finder.d.ts:32
