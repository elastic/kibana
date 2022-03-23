[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_internal\_namespace](../modules/client._internal_namespace.md) / SavedObjectsClient

# Class: SavedObjectsClient

[client](../modules/client.md).[_internal_namespace](../modules/client._internal_namespace.md).SavedObjectsClient

## Table of contents

### Constructors

- [constructor](client._internal_namespace.SavedObjectsClient.md#constructor)

### Properties

- [\_repository](client._internal_namespace.SavedObjectsClient.md#_repository)
- [errors](client._internal_namespace.SavedObjectsClient.md#errors)
- [errors](client._internal_namespace.SavedObjectsClient.md#errors)

### Methods

- [bulkCreate](client._internal_namespace.SavedObjectsClient.md#bulkcreate)
- [bulkGet](client._internal_namespace.SavedObjectsClient.md#bulkget)
- [bulkResolve](client._internal_namespace.SavedObjectsClient.md#bulkresolve)
- [bulkUpdate](client._internal_namespace.SavedObjectsClient.md#bulkupdate)
- [checkConflicts](client._internal_namespace.SavedObjectsClient.md#checkconflicts)
- [closePointInTime](client._internal_namespace.SavedObjectsClient.md#closepointintime)
- [collectMultiNamespaceReferences](client._internal_namespace.SavedObjectsClient.md#collectmultinamespacereferences)
- [create](client._internal_namespace.SavedObjectsClient.md#create)
- [createPointInTimeFinder](client._internal_namespace.SavedObjectsClient.md#createpointintimefinder)
- [delete](client._internal_namespace.SavedObjectsClient.md#delete)
- [find](client._internal_namespace.SavedObjectsClient.md#find)
- [get](client._internal_namespace.SavedObjectsClient.md#get)
- [openPointInTimeForType](client._internal_namespace.SavedObjectsClient.md#openpointintimefortype)
- [removeReferencesTo](client._internal_namespace.SavedObjectsClient.md#removereferencesto)
- [resolve](client._internal_namespace.SavedObjectsClient.md#resolve)
- [update](client._internal_namespace.SavedObjectsClient.md#update)
- [updateObjectsSpaces](client._internal_namespace.SavedObjectsClient.md#updateobjectsspaces)

## Constructors

### constructor

• **new SavedObjectsClient**(`repository`)

**`internal`**

#### Parameters

| Name | Type |
| :------ | :------ |
| `repository` | [`ISavedObjectsRepository`](../modules/client._internal_namespace.md#isavedobjectsrepository) |

#### Defined in

src/core/target/types/server/saved_objects/service/saved_objects_client.d.ts:371

## Properties

### \_repository

• `Private` **\_repository**: `any`

#### Defined in

src/core/target/types/server/saved_objects/service/saved_objects_client.d.ts:369

___

### errors

• **errors**: typeof [`SavedObjectsErrorHelpers`](client._internal_namespace.SavedObjectsErrorHelpers.md)

#### Defined in

src/core/target/types/server/saved_objects/service/saved_objects_client.d.ts:368

___

### errors

▪ `Static` **errors**: typeof [`SavedObjectsErrorHelpers`](client._internal_namespace.SavedObjectsErrorHelpers.md)

#### Defined in

src/core/target/types/server/saved_objects/service/saved_objects_client.d.ts:367

## Methods

### bulkCreate

▸ **bulkCreate**<`T`\>(`objects`, `options?`): `Promise`<[`SavedObjectsBulkResponse`](../interfaces/client._internal_namespace.SavedObjectsBulkResponse.md)<`T`\>\>

Persists multiple documents batched together as a single request

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | `unknown` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `objects` | [`SavedObjectsBulkCreateObject`](../interfaces/client._internal_namespace.SavedObjectsBulkCreateObject.md)<`T`\>[] |
| `options?` | [`SavedObjectsCreateOptions`](../interfaces/client._internal_namespace.SavedObjectsCreateOptions.md) |

#### Returns

`Promise`<[`SavedObjectsBulkResponse`](../interfaces/client._internal_namespace.SavedObjectsBulkResponse.md)<`T`\>\>

#### Defined in

src/core/target/types/server/saved_objects/service/saved_objects_client.d.ts:386

___

### bulkGet

▸ **bulkGet**<`T`\>(`objects?`, `options?`): `Promise`<[`SavedObjectsBulkResponse`](../interfaces/client._internal_namespace.SavedObjectsBulkResponse.md)<`T`\>\>

Returns an array of objects by id

**`example`**

bulkGet([
  { id: 'one', type: 'config' },
  { id: 'foo', type: 'index-pattern' }
])

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | `unknown` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `objects?` | [`SavedObjectsBulkGetObject`](../interfaces/client._internal_namespace.SavedObjectsBulkGetObject.md)[] | an array of ids, or an array of objects containing id, type and optionally fields |
| `options?` | [`SavedObjectsBaseOptions`](../interfaces/client._internal_namespace.SavedObjectsBaseOptions.md) | - |

#### Returns

`Promise`<[`SavedObjectsBulkResponse`](../interfaces/client._internal_namespace.SavedObjectsBulkResponse.md)<`T`\>\>

#### Defined in

src/core/target/types/server/saved_objects/service/saved_objects_client.d.ts:420

___

### bulkResolve

▸ **bulkResolve**<`T`\>(`objects`, `options?`): `Promise`<[`SavedObjectsBulkResolveResponse`](../interfaces/client._internal_namespace.SavedObjectsBulkResolveResponse.md)<`T`\>\>

Resolves an array of objects by id, using any legacy URL aliases if they exist

**`example`**

bulkResolve([
  { id: 'one', type: 'config' },
  { id: 'foo', type: 'index-pattern' }
])

**`note`** Saved objects that Kibana fails to find are replaced with an error object and an "exactMatch" outcome. The rationale behind the
outcome is that "exactMatch" is the default outcome, and the outcome only changes if an alias is found. This behavior is unique to
`bulkResolve`; the regular `resolve` API will throw an error instead.

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | `unknown` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `objects` | [`SavedObjectsBulkResolveObject`](../interfaces/client._internal_namespace.SavedObjectsBulkResolveObject.md)[] | an array of objects containing id, type |
| `options?` | [`SavedObjectsBaseOptions`](../interfaces/client._internal_namespace.SavedObjectsBaseOptions.md) | - |

#### Returns

`Promise`<[`SavedObjectsBulkResolveResponse`](../interfaces/client._internal_namespace.SavedObjectsBulkResolveResponse.md)<`T`\>\>

#### Defined in

src/core/target/types/server/saved_objects/service/saved_objects_client.d.ts:444

___

### bulkUpdate

▸ **bulkUpdate**<`T`\>(`objects`, `options?`): `Promise`<[`SavedObjectsBulkUpdateResponse`](../interfaces/client._internal_namespace.SavedObjectsBulkUpdateResponse.md)<`T`\>\>

Bulk Updates multiple SavedObject at once

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | `unknown` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `objects` | [`SavedObjectsBulkUpdateObject`](../interfaces/client._internal_namespace.SavedObjectsBulkUpdateObject.md)<`T`\>[] |
| `options?` | [`SavedObjectsBulkUpdateOptions`](../interfaces/client._internal_namespace.SavedObjectsBulkUpdateOptions.md) |

#### Returns

`Promise`<[`SavedObjectsBulkUpdateResponse`](../interfaces/client._internal_namespace.SavedObjectsBulkUpdateResponse.md)<`T`\>\>

#### Defined in

src/core/target/types/server/saved_objects/service/saved_objects_client.d.ts:466

___

### checkConflicts

▸ **checkConflicts**(`objects?`, `options?`): `Promise`<[`SavedObjectsCheckConflictsResponse`](../interfaces/client._internal_namespace.SavedObjectsCheckConflictsResponse.md)\>

Check what conflicts will result when creating a given array of saved objects. This includes "unresolvable conflicts", which are
multi-namespace objects that exist in a different namespace; such conflicts cannot be resolved/overwritten.

#### Parameters

| Name | Type |
| :------ | :------ |
| `objects?` | [`SavedObjectsCheckConflictsObject`](../interfaces/client._internal_namespace.SavedObjectsCheckConflictsObject.md)[] |
| `options?` | [`SavedObjectsBaseOptions`](../interfaces/client._internal_namespace.SavedObjectsBaseOptions.md) |

#### Returns

`Promise`<[`SavedObjectsCheckConflictsResponse`](../interfaces/client._internal_namespace.SavedObjectsCheckConflictsResponse.md)\>

#### Defined in

src/core/target/types/server/saved_objects/service/saved_objects_client.d.ts:394

___

### closePointInTime

▸ **closePointInTime**(`id`, `options?`): `Promise`<[`SavedObjectsClosePointInTimeResponse`](../interfaces/client._internal_namespace.SavedObjectsClosePointInTimeResponse.md)\>

Closes a Point In Time (PIT) by ID. This simply proxies the request to ES via the
Elasticsearch client, and is included in the Saved Objects Client as a convenience
for consumers who are using [SavedObjectsClient.openPointInTimeForType](client._internal_namespace.SavedObjectsClient.md#openpointintimefortype).

Only use this API if you have an advanced use case that's not solved by the
[SavedObjectsClient.createPointInTimeFinder](client._internal_namespace.SavedObjectsClient.md#createpointintimefinder) method.

#### Parameters

| Name | Type |
| :------ | :------ |
| `id` | `string` |
| `options?` | [`SavedObjectsBaseOptions`](../interfaces/client._internal_namespace.SavedObjectsBaseOptions.md) |

#### Returns

`Promise`<[`SavedObjectsClosePointInTimeResponse`](../interfaces/client._internal_namespace.SavedObjectsClosePointInTimeResponse.md)\>

#### Defined in

src/core/target/types/server/saved_objects/service/saved_objects_client.d.ts:488

___

### collectMultiNamespaceReferences

▸ **collectMultiNamespaceReferences**(`objects`, `options?`): `Promise`<[`SavedObjectsCollectMultiNamespaceReferencesResponse`](../interfaces/client._internal_namespace.SavedObjectsCollectMultiNamespaceReferencesResponse.md)\>

Gets all references and transitive references of the listed objects. Ignores any object that is not a multi-namespace type.

#### Parameters

| Name | Type |
| :------ | :------ |
| `objects` | [`SavedObjectsCollectMultiNamespaceReferencesObject`](../interfaces/client._internal_namespace.SavedObjectsCollectMultiNamespaceReferencesObject.md)[] |
| `options?` | [`SavedObjectsCollectMultiNamespaceReferencesOptions`](../interfaces/client._internal_namespace.SavedObjectsCollectMultiNamespaceReferencesOptions.md) |

#### Returns

`Promise`<[`SavedObjectsCollectMultiNamespaceReferencesResponse`](../interfaces/client._internal_namespace.SavedObjectsCollectMultiNamespaceReferencesResponse.md)\>

#### Defined in

src/core/target/types/server/saved_objects/service/saved_objects_client.d.ts:541

___

### create

▸ **create**<`T`\>(`type`, `attributes`, `options?`): `Promise`<[`SavedObject`](../interfaces/client._internal_namespace.SavedObject.md)<`T`\>\>

Persists a SavedObject

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | `unknown` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `type` | `string` |
| `attributes` | `T` |
| `options?` | [`SavedObjectsCreateOptions`](../interfaces/client._internal_namespace.SavedObjectsCreateOptions.md) |

#### Returns

`Promise`<[`SavedObject`](../interfaces/client._internal_namespace.SavedObject.md)<`T`\>\>

#### Defined in

src/core/target/types/server/saved_objects/service/saved_objects_client.d.ts:379

___

### createPointInTimeFinder

▸ **createPointInTimeFinder**<`T`, `A`\>(`findOptions`, `dependencies?`): [`ISavedObjectsPointInTimeFinder`](../interfaces/client._internal_namespace.ISavedObjectsPointInTimeFinder.md)<`T`, `A`\>

Returns a [ISavedObjectsPointInTimeFinder](../interfaces/client._internal_namespace.ISavedObjectsPointInTimeFinder.md) to help page through
large sets of saved objects. We strongly recommend using this API for
any `find` queries that might return more than 1000 saved objects,
however this API is only intended for use in server-side "batch"
processing of objects where you are collecting all objects in memory
or streaming them back to the client.

Do NOT use this API in a route handler to facilitate paging through
saved objects on the client-side unless you are streaming all of the
results back to the client at once. Because the returned generator is
stateful, you cannot rely on subsequent http requests retrieving new
pages from the same Kibana server in multi-instance deployments.

The generator wraps calls to [SavedObjectsClient.find](client._internal_namespace.SavedObjectsClient.md#find) and iterates
over multiple pages of results using `_pit` and `search_after`. This will
open a new Point-In-Time (PIT), and continue paging until a set of
results is received that's smaller than the designated `perPage`.

Once you have retrieved all of the results you need, it is recommended
to call `close()` to clean up the PIT and prevent Elasticsearch from
consuming resources unnecessarily. This is only required if you are
done iterating and have not yet paged through all of the results: the
PIT will automatically be closed for you once you reach the last page
of results, or if the underlying call to `find` fails for any reason.

**`example`**
```ts
const findOptions: SavedObjectsCreatePointInTimeFinderOptions = {
  type: 'visualization',
  search: 'foo*',
  perPage: 100,
};

const finder = savedObjectsClient.createPointInTimeFinder(findOptions);

const responses: SavedObjectFindResponse[] = [];
for await (const response of finder.find()) {
  responses.push(...response);
  if (doneSearching) {
    await finder.close();
  }
}
```

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | `unknown` |
| `A` | `unknown` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `findOptions` | [`SavedObjectsCreatePointInTimeFinderOptions`](../modules/client._internal_namespace.md#savedobjectscreatepointintimefinderoptions) |
| `dependencies?` | [`SavedObjectsCreatePointInTimeFinderDependencies`](../interfaces/client._internal_namespace.SavedObjectsCreatePointInTimeFinderDependencies.md) |

#### Returns

[`ISavedObjectsPointInTimeFinder`](../interfaces/client._internal_namespace.ISavedObjectsPointInTimeFinder.md)<`T`, `A`\>

#### Defined in

src/core/target/types/server/saved_objects/service/saved_objects_client.d.ts:534

___

### delete

▸ **delete**(`type`, `id`, `options?`): `Promise`<{}\>

Deletes a SavedObject

#### Parameters

| Name | Type |
| :------ | :------ |
| `type` | `string` |
| `id` | `string` |
| `options?` | [`SavedObjectsDeleteOptions`](../interfaces/client._internal_namespace.SavedObjectsDeleteOptions.md) |

#### Returns

`Promise`<{}\>

#### Defined in

src/core/target/types/server/saved_objects/service/saved_objects_client.d.ts:402

___

### find

▸ **find**<`T`, `A`\>(`options`): `Promise`<[`SavedObjectsFindResponse`](../interfaces/client._internal_namespace.SavedObjectsFindResponse.md)<`T`, `A`\>\>

Find all SavedObjects matching the search query

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | `unknown` |
| `A` | `unknown` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `options` | [`SavedObjectsFindOptions`](../interfaces/client._internal_namespace.SavedObjectsFindOptions.md) |

#### Returns

`Promise`<[`SavedObjectsFindResponse`](../interfaces/client._internal_namespace.SavedObjectsFindResponse.md)<`T`, `A`\>\>

#### Defined in

src/core/target/types/server/saved_objects/service/saved_objects_client.d.ts:408

___

### get

▸ **get**<`T`\>(`type`, `id`, `options?`): `Promise`<[`SavedObject`](../interfaces/client._internal_namespace.SavedObject.md)<`T`\>\>

Retrieves a single object

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | `unknown` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `type` | `string` | The type of SavedObject to retrieve |
| `id` | `string` | The ID of the SavedObject to retrieve |
| `options?` | [`SavedObjectsBaseOptions`](../interfaces/client._internal_namespace.SavedObjectsBaseOptions.md) |  |

#### Returns

`Promise`<[`SavedObject`](../interfaces/client._internal_namespace.SavedObject.md)<`T`\>\>

#### Defined in

src/core/target/types/server/saved_objects/service/saved_objects_client.d.ts:428

___

### openPointInTimeForType

▸ **openPointInTimeForType**(`type`, `options?`): `Promise`<[`SavedObjectsOpenPointInTimeResponse`](../interfaces/client._internal_namespace.SavedObjectsOpenPointInTimeResponse.md)\>

Opens a Point In Time (PIT) against the indices for the specified Saved Object types.
The returned `id` can then be passed to [SavedObjectsClient.find](client._internal_namespace.SavedObjectsClient.md#find) to search
against that PIT.

Only use this API if you have an advanced use case that's not solved by the
[SavedObjectsClient.createPointInTimeFinder](client._internal_namespace.SavedObjectsClient.md#createpointintimefinder) method.

#### Parameters

| Name | Type |
| :------ | :------ |
| `type` | `string` \| `string`[] |
| `options?` | [`SavedObjectsOpenPointInTimeOptions`](../interfaces/client._internal_namespace.SavedObjectsOpenPointInTimeOptions.md) |

#### Returns

`Promise`<[`SavedObjectsOpenPointInTimeResponse`](../interfaces/client._internal_namespace.SavedObjectsOpenPointInTimeResponse.md)\>

#### Defined in

src/core/target/types/server/saved_objects/service/saved_objects_client.d.ts:479

___

### removeReferencesTo

▸ **removeReferencesTo**(`type`, `id`, `options?`): `Promise`<[`SavedObjectsRemoveReferencesToResponse`](../interfaces/client._internal_namespace.SavedObjectsRemoveReferencesToResponse.md)\>

Updates all objects containing a reference to the given {type, id} tuple to remove the said reference.

#### Parameters

| Name | Type |
| :------ | :------ |
| `type` | `string` |
| `id` | `string` |
| `options?` | [`SavedObjectsRemoveReferencesToOptions`](../interfaces/client._internal_namespace.SavedObjectsRemoveReferencesToOptions.md) |

#### Returns

`Promise`<[`SavedObjectsRemoveReferencesToResponse`](../interfaces/client._internal_namespace.SavedObjectsRemoveReferencesToResponse.md)\>

#### Defined in

src/core/target/types/server/saved_objects/service/saved_objects_client.d.ts:470

___

### resolve

▸ **resolve**<`T`\>(`type`, `id`, `options?`): `Promise`<[`SavedObjectsResolveResponse`](../interfaces/client._internal_namespace.SavedObjectsResolveResponse.md)<`T`\>\>

Resolves a single object, using any legacy URL alias if it exists

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | `unknown` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `type` | `string` | The type of SavedObject to retrieve |
| `id` | `string` | The ID of the SavedObject to retrieve |
| `options?` | [`SavedObjectsBaseOptions`](../interfaces/client._internal_namespace.SavedObjectsBaseOptions.md) |  |

#### Returns

`Promise`<[`SavedObjectsResolveResponse`](../interfaces/client._internal_namespace.SavedObjectsResolveResponse.md)<`T`\>\>

#### Defined in

src/core/target/types/server/saved_objects/service/saved_objects_client.d.ts:452

___

### update

▸ **update**<`T`\>(`type`, `id`, `attributes`, `options?`): `Promise`<[`SavedObjectsUpdateResponse`](../interfaces/client._internal_namespace.SavedObjectsUpdateResponse.md)<`T`\>\>

Updates an SavedObject

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | `unknown` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `type` | `string` |
| `id` | `string` |
| `attributes` | `Partial`<`T`\> |
| `options?` | [`SavedObjectsUpdateOptions`](../interfaces/client._internal_namespace.SavedObjectsUpdateOptions.md)<`T`\> |

#### Returns

`Promise`<[`SavedObjectsUpdateResponse`](../interfaces/client._internal_namespace.SavedObjectsUpdateResponse.md)<`T`\>\>

#### Defined in

src/core/target/types/server/saved_objects/service/saved_objects_client.d.ts:460

___

### updateObjectsSpaces

▸ **updateObjectsSpaces**(`objects`, `spacesToAdd`, `spacesToRemove`, `options?`): `Promise`<[`SavedObjectsUpdateObjectsSpacesResponse`](../interfaces/client._internal_namespace.SavedObjectsUpdateObjectsSpacesResponse.md)\>

Updates one or more objects to add and/or remove them from specified spaces.

#### Parameters

| Name | Type |
| :------ | :------ |
| `objects` | [`SavedObjectsUpdateObjectsSpacesObject`](../interfaces/client._internal_namespace.SavedObjectsUpdateObjectsSpacesObject.md)[] |
| `spacesToAdd` | `string`[] |
| `spacesToRemove` | `string`[] |
| `options?` | [`SavedObjectsUpdateObjectsSpacesOptions`](../interfaces/client._internal_namespace.SavedObjectsUpdateObjectsSpacesOptions.md) |

#### Returns

`Promise`<[`SavedObjectsUpdateObjectsSpacesResponse`](../interfaces/client._internal_namespace.SavedObjectsUpdateObjectsSpacesResponse.md)\>

#### Defined in

src/core/target/types/server/saved_objects/service/saved_objects_client.d.ts:550
