[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_\_internalNamespace](../modules/client.__internalNamespace.md) / SavedObjectsClient

# Class: SavedObjectsClient

[client](../modules/client.md).[__internalNamespace](../modules/client.__internalNamespace.md).SavedObjectsClient

## Table of contents

### Constructors

- [constructor](client.__internalNamespace.SavedObjectsClient.md#constructor)

### Properties

- [\_repository](client.__internalNamespace.SavedObjectsClient.md#_repository)
- [errors](client.__internalNamespace.SavedObjectsClient.md#errors)
- [errors](client.__internalNamespace.SavedObjectsClient.md#errors)

### Methods

- [bulkCreate](client.__internalNamespace.SavedObjectsClient.md#bulkcreate)
- [bulkGet](client.__internalNamespace.SavedObjectsClient.md#bulkget)
- [bulkResolve](client.__internalNamespace.SavedObjectsClient.md#bulkresolve)
- [bulkUpdate](client.__internalNamespace.SavedObjectsClient.md#bulkupdate)
- [checkConflicts](client.__internalNamespace.SavedObjectsClient.md#checkconflicts)
- [closePointInTime](client.__internalNamespace.SavedObjectsClient.md#closepointintime)
- [collectMultiNamespaceReferences](client.__internalNamespace.SavedObjectsClient.md#collectmultinamespacereferences)
- [create](client.__internalNamespace.SavedObjectsClient.md#create)
- [createPointInTimeFinder](client.__internalNamespace.SavedObjectsClient.md#createpointintimefinder)
- [delete](client.__internalNamespace.SavedObjectsClient.md#delete)
- [find](client.__internalNamespace.SavedObjectsClient.md#find)
- [get](client.__internalNamespace.SavedObjectsClient.md#get)
- [openPointInTimeForType](client.__internalNamespace.SavedObjectsClient.md#openpointintimefortype)
- [removeReferencesTo](client.__internalNamespace.SavedObjectsClient.md#removereferencesto)
- [resolve](client.__internalNamespace.SavedObjectsClient.md#resolve)
- [update](client.__internalNamespace.SavedObjectsClient.md#update)
- [updateObjectsSpaces](client.__internalNamespace.SavedObjectsClient.md#updateobjectsspaces)

## Constructors

### constructor

• **new SavedObjectsClient**(`repository`)

**`internal`**

#### Parameters

| Name | Type |
| :------ | :------ |
| `repository` | [`ISavedObjectsRepository`](../modules/client.__internalNamespace.md#isavedobjectsrepository) |

#### Defined in

src/core/target/types/server/saved_objects/service/saved_objects_client.d.ts:371

## Properties

### \_repository

• `Private` **\_repository**: `any`

#### Defined in

src/core/target/types/server/saved_objects/service/saved_objects_client.d.ts:369

___

### errors

• **errors**: typeof [`SavedObjectsErrorHelpers`](client.__internalNamespace.SavedObjectsErrorHelpers.md)

#### Defined in

src/core/target/types/server/saved_objects/service/saved_objects_client.d.ts:368

___

### errors

▪ `Static` **errors**: typeof [`SavedObjectsErrorHelpers`](client.__internalNamespace.SavedObjectsErrorHelpers.md)

#### Defined in

src/core/target/types/server/saved_objects/service/saved_objects_client.d.ts:367

## Methods

### bulkCreate

▸ **bulkCreate**<`T`\>(`objects`, `options?`): `Promise`<[`SavedObjectsBulkResponse`](../interfaces/client.__internalNamespace.SavedObjectsBulkResponse.md)<`T`\>\>

Persists multiple documents batched together as a single request

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | `unknown` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `objects` | [`SavedObjectsBulkCreateObject`](../interfaces/client.__internalNamespace.SavedObjectsBulkCreateObject.md)<`T`\>[] |
| `options?` | [`SavedObjectsCreateOptions`](../interfaces/client.__internalNamespace.SavedObjectsCreateOptions.md) |

#### Returns

`Promise`<[`SavedObjectsBulkResponse`](../interfaces/client.__internalNamespace.SavedObjectsBulkResponse.md)<`T`\>\>

#### Defined in

src/core/target/types/server/saved_objects/service/saved_objects_client.d.ts:386

___

### bulkGet

▸ **bulkGet**<`T`\>(`objects?`, `options?`): `Promise`<[`SavedObjectsBulkResponse`](../interfaces/client.__internalNamespace.SavedObjectsBulkResponse.md)<`T`\>\>

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
| `objects?` | [`SavedObjectsBulkGetObject`](../interfaces/client.__internalNamespace.SavedObjectsBulkGetObject.md)[] | an array of ids, or an array of objects containing id, type and optionally fields |
| `options?` | [`SavedObjectsBaseOptions`](../interfaces/client.__internalNamespace.SavedObjectsBaseOptions.md) | - |

#### Returns

`Promise`<[`SavedObjectsBulkResponse`](../interfaces/client.__internalNamespace.SavedObjectsBulkResponse.md)<`T`\>\>

#### Defined in

src/core/target/types/server/saved_objects/service/saved_objects_client.d.ts:420

___

### bulkResolve

▸ **bulkResolve**<`T`\>(`objects`, `options?`): `Promise`<[`SavedObjectsBulkResolveResponse`](../interfaces/client.__internalNamespace.SavedObjectsBulkResolveResponse.md)<`T`\>\>

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
| `objects` | [`SavedObjectsBulkResolveObject`](../interfaces/client.__internalNamespace.SavedObjectsBulkResolveObject.md)[] | an array of objects containing id, type |
| `options?` | [`SavedObjectsBaseOptions`](../interfaces/client.__internalNamespace.SavedObjectsBaseOptions.md) | - |

#### Returns

`Promise`<[`SavedObjectsBulkResolveResponse`](../interfaces/client.__internalNamespace.SavedObjectsBulkResolveResponse.md)<`T`\>\>

#### Defined in

src/core/target/types/server/saved_objects/service/saved_objects_client.d.ts:444

___

### bulkUpdate

▸ **bulkUpdate**<`T`\>(`objects`, `options?`): `Promise`<[`SavedObjectsBulkUpdateResponse`](../interfaces/client.__internalNamespace.SavedObjectsBulkUpdateResponse.md)<`T`\>\>

Bulk Updates multiple SavedObject at once

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | `unknown` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `objects` | [`SavedObjectsBulkUpdateObject`](../interfaces/client.__internalNamespace.SavedObjectsBulkUpdateObject.md)<`T`\>[] |
| `options?` | [`SavedObjectsBulkUpdateOptions`](../interfaces/client.__internalNamespace.SavedObjectsBulkUpdateOptions.md) |

#### Returns

`Promise`<[`SavedObjectsBulkUpdateResponse`](../interfaces/client.__internalNamespace.SavedObjectsBulkUpdateResponse.md)<`T`\>\>

#### Defined in

src/core/target/types/server/saved_objects/service/saved_objects_client.d.ts:466

___

### checkConflicts

▸ **checkConflicts**(`objects?`, `options?`): `Promise`<[`SavedObjectsCheckConflictsResponse`](../interfaces/client.__internalNamespace.SavedObjectsCheckConflictsResponse.md)\>

Check what conflicts will result when creating a given array of saved objects. This includes "unresolvable conflicts", which are
multi-namespace objects that exist in a different namespace; such conflicts cannot be resolved/overwritten.

#### Parameters

| Name | Type |
| :------ | :------ |
| `objects?` | [`SavedObjectsCheckConflictsObject`](../interfaces/client.__internalNamespace.SavedObjectsCheckConflictsObject.md)[] |
| `options?` | [`SavedObjectsBaseOptions`](../interfaces/client.__internalNamespace.SavedObjectsBaseOptions.md) |

#### Returns

`Promise`<[`SavedObjectsCheckConflictsResponse`](../interfaces/client.__internalNamespace.SavedObjectsCheckConflictsResponse.md)\>

#### Defined in

src/core/target/types/server/saved_objects/service/saved_objects_client.d.ts:394

___

### closePointInTime

▸ **closePointInTime**(`id`, `options?`): `Promise`<[`SavedObjectsClosePointInTimeResponse`](../interfaces/client.__internalNamespace.SavedObjectsClosePointInTimeResponse.md)\>

Closes a Point In Time (PIT) by ID. This simply proxies the request to ES via the
Elasticsearch client, and is included in the Saved Objects Client as a convenience
for consumers who are using [SavedObjectsClient.openPointInTimeForType](client.__internalNamespace.SavedObjectsClient.md#openpointintimefortype).

Only use this API if you have an advanced use case that's not solved by the
[SavedObjectsClient.createPointInTimeFinder](client.__internalNamespace.SavedObjectsClient.md#createpointintimefinder) method.

#### Parameters

| Name | Type |
| :------ | :------ |
| `id` | `string` |
| `options?` | [`SavedObjectsBaseOptions`](../interfaces/client.__internalNamespace.SavedObjectsBaseOptions.md) |

#### Returns

`Promise`<[`SavedObjectsClosePointInTimeResponse`](../interfaces/client.__internalNamespace.SavedObjectsClosePointInTimeResponse.md)\>

#### Defined in

src/core/target/types/server/saved_objects/service/saved_objects_client.d.ts:488

___

### collectMultiNamespaceReferences

▸ **collectMultiNamespaceReferences**(`objects`, `options?`): `Promise`<[`SavedObjectsCollectMultiNamespaceReferencesResponse`](../interfaces/client.__internalNamespace.SavedObjectsCollectMultiNamespaceReferencesResponse.md)\>

Gets all references and transitive references of the listed objects. Ignores any object that is not a multi-namespace type.

#### Parameters

| Name | Type |
| :------ | :------ |
| `objects` | [`SavedObjectsCollectMultiNamespaceReferencesObject`](../interfaces/client.__internalNamespace.SavedObjectsCollectMultiNamespaceReferencesObject.md)[] |
| `options?` | [`SavedObjectsCollectMultiNamespaceReferencesOptions`](../interfaces/client.__internalNamespace.SavedObjectsCollectMultiNamespaceReferencesOptions.md) |

#### Returns

`Promise`<[`SavedObjectsCollectMultiNamespaceReferencesResponse`](../interfaces/client.__internalNamespace.SavedObjectsCollectMultiNamespaceReferencesResponse.md)\>

#### Defined in

src/core/target/types/server/saved_objects/service/saved_objects_client.d.ts:541

___

### create

▸ **create**<`T`\>(`type`, `attributes`, `options?`): `Promise`<[`SavedObject`](../interfaces/client.__internalNamespace.SavedObject.md)<`T`\>\>

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
| `options?` | [`SavedObjectsCreateOptions`](../interfaces/client.__internalNamespace.SavedObjectsCreateOptions.md) |

#### Returns

`Promise`<[`SavedObject`](../interfaces/client.__internalNamespace.SavedObject.md)<`T`\>\>

#### Defined in

src/core/target/types/server/saved_objects/service/saved_objects_client.d.ts:379

___

### createPointInTimeFinder

▸ **createPointInTimeFinder**<`T`, `A`\>(`findOptions`, `dependencies?`): [`ISavedObjectsPointInTimeFinder`](../interfaces/client.__internalNamespace.ISavedObjectsPointInTimeFinder.md)<`T`, `A`\>

Returns a [ISavedObjectsPointInTimeFinder](../interfaces/client.__internalNamespace.ISavedObjectsPointInTimeFinder.md) to help page through
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

The generator wraps calls to [SavedObjectsClient.find](client.__internalNamespace.SavedObjectsClient.md#find) and iterates
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
| `findOptions` | [`SavedObjectsCreatePointInTimeFinderOptions`](../modules/client.__internalNamespace.md#savedobjectscreatepointintimefinderoptions) |
| `dependencies?` | [`SavedObjectsCreatePointInTimeFinderDependencies`](../interfaces/client.__internalNamespace.SavedObjectsCreatePointInTimeFinderDependencies.md) |

#### Returns

[`ISavedObjectsPointInTimeFinder`](../interfaces/client.__internalNamespace.ISavedObjectsPointInTimeFinder.md)<`T`, `A`\>

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
| `options?` | [`SavedObjectsDeleteOptions`](../interfaces/client.__internalNamespace.SavedObjectsDeleteOptions.md) |

#### Returns

`Promise`<{}\>

#### Defined in

src/core/target/types/server/saved_objects/service/saved_objects_client.d.ts:402

___

### find

▸ **find**<`T`, `A`\>(`options`): `Promise`<[`SavedObjectsFindResponse`](../interfaces/client.__internalNamespace.SavedObjectsFindResponse.md)<`T`, `A`\>\>

Find all SavedObjects matching the search query

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | `unknown` |
| `A` | `unknown` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `options` | [`SavedObjectsFindOptions`](../interfaces/client.__internalNamespace.SavedObjectsFindOptions.md) |

#### Returns

`Promise`<[`SavedObjectsFindResponse`](../interfaces/client.__internalNamespace.SavedObjectsFindResponse.md)<`T`, `A`\>\>

#### Defined in

src/core/target/types/server/saved_objects/service/saved_objects_client.d.ts:408

___

### get

▸ **get**<`T`\>(`type`, `id`, `options?`): `Promise`<[`SavedObject`](../interfaces/client.__internalNamespace.SavedObject.md)<`T`\>\>

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
| `options?` | [`SavedObjectsBaseOptions`](../interfaces/client.__internalNamespace.SavedObjectsBaseOptions.md) |  |

#### Returns

`Promise`<[`SavedObject`](../interfaces/client.__internalNamespace.SavedObject.md)<`T`\>\>

#### Defined in

src/core/target/types/server/saved_objects/service/saved_objects_client.d.ts:428

___

### openPointInTimeForType

▸ **openPointInTimeForType**(`type`, `options?`): `Promise`<[`SavedObjectsOpenPointInTimeResponse`](../interfaces/client.__internalNamespace.SavedObjectsOpenPointInTimeResponse.md)\>

Opens a Point In Time (PIT) against the indices for the specified Saved Object types.
The returned `id` can then be passed to [SavedObjectsClient.find](client.__internalNamespace.SavedObjectsClient.md#find) to search
against that PIT.

Only use this API if you have an advanced use case that's not solved by the
[SavedObjectsClient.createPointInTimeFinder](client.__internalNamespace.SavedObjectsClient.md#createpointintimefinder) method.

#### Parameters

| Name | Type |
| :------ | :------ |
| `type` | `string` \| `string`[] |
| `options?` | [`SavedObjectsOpenPointInTimeOptions`](../interfaces/client.__internalNamespace.SavedObjectsOpenPointInTimeOptions.md) |

#### Returns

`Promise`<[`SavedObjectsOpenPointInTimeResponse`](../interfaces/client.__internalNamespace.SavedObjectsOpenPointInTimeResponse.md)\>

#### Defined in

src/core/target/types/server/saved_objects/service/saved_objects_client.d.ts:479

___

### removeReferencesTo

▸ **removeReferencesTo**(`type`, `id`, `options?`): `Promise`<[`SavedObjectsRemoveReferencesToResponse`](../interfaces/client.__internalNamespace.SavedObjectsRemoveReferencesToResponse.md)\>

Updates all objects containing a reference to the given {type, id} tuple to remove the said reference.

#### Parameters

| Name | Type |
| :------ | :------ |
| `type` | `string` |
| `id` | `string` |
| `options?` | [`SavedObjectsRemoveReferencesToOptions`](../interfaces/client.__internalNamespace.SavedObjectsRemoveReferencesToOptions.md) |

#### Returns

`Promise`<[`SavedObjectsRemoveReferencesToResponse`](../interfaces/client.__internalNamespace.SavedObjectsRemoveReferencesToResponse.md)\>

#### Defined in

src/core/target/types/server/saved_objects/service/saved_objects_client.d.ts:470

___

### resolve

▸ **resolve**<`T`\>(`type`, `id`, `options?`): `Promise`<[`SavedObjectsResolveResponse`](../interfaces/client.__internalNamespace.SavedObjectsResolveResponse.md)<`T`\>\>

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
| `options?` | [`SavedObjectsBaseOptions`](../interfaces/client.__internalNamespace.SavedObjectsBaseOptions.md) |  |

#### Returns

`Promise`<[`SavedObjectsResolveResponse`](../interfaces/client.__internalNamespace.SavedObjectsResolveResponse.md)<`T`\>\>

#### Defined in

src/core/target/types/server/saved_objects/service/saved_objects_client.d.ts:452

___

### update

▸ **update**<`T`\>(`type`, `id`, `attributes`, `options?`): `Promise`<[`SavedObjectsUpdateResponse`](../interfaces/client.__internalNamespace.SavedObjectsUpdateResponse.md)<`T`\>\>

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
| `options?` | [`SavedObjectsUpdateOptions`](../interfaces/client.__internalNamespace.SavedObjectsUpdateOptions.md)<`T`\> |

#### Returns

`Promise`<[`SavedObjectsUpdateResponse`](../interfaces/client.__internalNamespace.SavedObjectsUpdateResponse.md)<`T`\>\>

#### Defined in

src/core/target/types/server/saved_objects/service/saved_objects_client.d.ts:460

___

### updateObjectsSpaces

▸ **updateObjectsSpaces**(`objects`, `spacesToAdd`, `spacesToRemove`, `options?`): `Promise`<[`SavedObjectsUpdateObjectsSpacesResponse`](../interfaces/client.__internalNamespace.SavedObjectsUpdateObjectsSpacesResponse.md)\>

Updates one or more objects to add and/or remove them from specified spaces.

#### Parameters

| Name | Type |
| :------ | :------ |
| `objects` | [`SavedObjectsUpdateObjectsSpacesObject`](../interfaces/client.__internalNamespace.SavedObjectsUpdateObjectsSpacesObject.md)[] |
| `spacesToAdd` | `string`[] |
| `spacesToRemove` | `string`[] |
| `options?` | [`SavedObjectsUpdateObjectsSpacesOptions`](../interfaces/client.__internalNamespace.SavedObjectsUpdateObjectsSpacesOptions.md) |

#### Returns

`Promise`<[`SavedObjectsUpdateObjectsSpacesResponse`](../interfaces/client.__internalNamespace.SavedObjectsUpdateObjectsSpacesResponse.md)\>

#### Defined in

src/core/target/types/server/saved_objects/service/saved_objects_client.d.ts:550
