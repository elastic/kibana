[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_\_internalNamespace](../modules/client.__internalNamespace.md) / SavedObjectsRepository

# Class: SavedObjectsRepository

[client](../modules/client.md).[__internalNamespace](../modules/client.__internalNamespace.md).SavedObjectsRepository

## Table of contents

### Constructors

- [constructor](client.__internalNamespace.SavedObjectsRepository.md#constructor)

### Properties

- [\_allowedTypes](client.__internalNamespace.SavedObjectsRepository.md#_allowedtypes)
- [\_index](client.__internalNamespace.SavedObjectsRepository.md#_index)
- [\_logger](client.__internalNamespace.SavedObjectsRepository.md#_logger)
- [\_mappings](client.__internalNamespace.SavedObjectsRepository.md#_mappings)
- [\_migrator](client.__internalNamespace.SavedObjectsRepository.md#_migrator)
- [\_rawToSavedObject](client.__internalNamespace.SavedObjectsRepository.md#_rawtosavedobject)
- [\_registry](client.__internalNamespace.SavedObjectsRepository.md#_registry)
- [\_serializer](client.__internalNamespace.SavedObjectsRepository.md#_serializer)
- [client](client.__internalNamespace.SavedObjectsRepository.md#client)
- [getIndexForType](client.__internalNamespace.SavedObjectsRepository.md#getindexfortype)
- [getIndicesForTypes](client.__internalNamespace.SavedObjectsRepository.md#getindicesfortypes)
- [incrementCounterInternal](client.__internalNamespace.SavedObjectsRepository.md#incrementcounterinternal)
- [preflightCheckForUpsertAliasConflict](client.__internalNamespace.SavedObjectsRepository.md#preflightcheckforupsertaliasconflict)
- [preflightCheckNamespaces](client.__internalNamespace.SavedObjectsRepository.md#preflightchecknamespaces)
- [rawDocExistsInNamespace](client.__internalNamespace.SavedObjectsRepository.md#rawdocexistsinnamespace)
- [rawDocExistsInNamespaces](client.__internalNamespace.SavedObjectsRepository.md#rawdocexistsinnamespaces)
- [validateInitialNamespaces](client.__internalNamespace.SavedObjectsRepository.md#validateinitialnamespaces)
- [validateObjectAttributes](client.__internalNamespace.SavedObjectsRepository.md#validateobjectattributes)
- [validateObjectNamespaces](client.__internalNamespace.SavedObjectsRepository.md#validateobjectnamespaces)

### Methods

- [bulkCreate](client.__internalNamespace.SavedObjectsRepository.md#bulkcreate)
- [bulkGet](client.__internalNamespace.SavedObjectsRepository.md#bulkget)
- [bulkResolve](client.__internalNamespace.SavedObjectsRepository.md#bulkresolve)
- [bulkUpdate](client.__internalNamespace.SavedObjectsRepository.md#bulkupdate)
- [checkConflicts](client.__internalNamespace.SavedObjectsRepository.md#checkconflicts)
- [closePointInTime](client.__internalNamespace.SavedObjectsRepository.md#closepointintime)
- [collectMultiNamespaceReferences](client.__internalNamespace.SavedObjectsRepository.md#collectmultinamespacereferences)
- [create](client.__internalNamespace.SavedObjectsRepository.md#create)
- [createPointInTimeFinder](client.__internalNamespace.SavedObjectsRepository.md#createpointintimefinder)
- [delete](client.__internalNamespace.SavedObjectsRepository.md#delete)
- [deleteByNamespace](client.__internalNamespace.SavedObjectsRepository.md#deletebynamespace)
- [find](client.__internalNamespace.SavedObjectsRepository.md#find)
- [get](client.__internalNamespace.SavedObjectsRepository.md#get)
- [incrementCounter](client.__internalNamespace.SavedObjectsRepository.md#incrementcounter)
- [openPointInTimeForType](client.__internalNamespace.SavedObjectsRepository.md#openpointintimefortype)
- [removeReferencesTo](client.__internalNamespace.SavedObjectsRepository.md#removereferencesto)
- [resolve](client.__internalNamespace.SavedObjectsRepository.md#resolve)
- [update](client.__internalNamespace.SavedObjectsRepository.md#update)
- [updateObjectsSpaces](client.__internalNamespace.SavedObjectsRepository.md#updateobjectsspaces)
- [createRepository](client.__internalNamespace.SavedObjectsRepository.md#createrepository)

## Constructors

### constructor

• `Private` **new SavedObjectsRepository**()

#### Defined in

src/core/target/types/server/saved_objects/service/lib/repository.d.ts:88

## Properties

### \_allowedTypes

• `Private` **\_allowedTypes**: `any`

#### Defined in

src/core/target/types/server/saved_objects/service/lib/repository.d.ts:75

___

### \_index

• `Private` **\_index**: `any`

#### Defined in

src/core/target/types/server/saved_objects/service/lib/repository.d.ts:72

___

### \_logger

• `Private` **\_logger**: `any`

#### Defined in

src/core/target/types/server/saved_objects/service/lib/repository.d.ts:78

___

### \_mappings

• `Private` **\_mappings**: `any`

#### Defined in

src/core/target/types/server/saved_objects/service/lib/repository.d.ts:73

___

### \_migrator

• `Private` **\_migrator**: `any`

#### Defined in

src/core/target/types/server/saved_objects/service/lib/repository.d.ts:71

___

### \_rawToSavedObject

• `Private` **\_rawToSavedObject**: `any`

#### Defined in

src/core/target/types/server/saved_objects/service/lib/repository.d.ts:445

___

### \_registry

• `Private` **\_registry**: `any`

#### Defined in

src/core/target/types/server/saved_objects/service/lib/repository.d.ts:74

___

### \_serializer

• `Private` **\_serializer**: `any`

#### Defined in

src/core/target/types/server/saved_objects/service/lib/repository.d.ts:77

___

### client

• `Private` `Readonly` **client**: `any`

#### Defined in

src/core/target/types/server/saved_objects/service/lib/repository.d.ts:76

___

### getIndexForType

• `Private` **getIndexForType**: `any`

Returns index specified by the given type or the default index

**`param`** the type

#### Defined in

src/core/target/types/server/saved_objects/service/lib/repository.d.ts:436

___

### getIndicesForTypes

• `Private` **getIndicesForTypes**: `any`

Returns an array of indices as specified in `this._registry` for each of the
given `types`. If any of the types don't have an associated index, the
default index `this._index` will be included.

**`param`** The types whose indices should be retrieved

#### Defined in

src/core/target/types/server/saved_objects/service/lib/repository.d.ts:444

___

### incrementCounterInternal

• `Private` **incrementCounterInternal**: `any`

**`internal`** incrementCounter function that is used internally and bypasses validation checks.

#### Defined in

src/core/target/types/server/saved_objects/service/lib/repository.d.ts:305

___

### preflightCheckForUpsertAliasConflict

• `Private` **preflightCheckForUpsertAliasConflict**: `any`

Pre-flight check to ensure that an upsert which would create a new object does not result in an alias conflict.

#### Defined in

src/core/target/types/server/saved_objects/service/lib/repository.d.ts:455

___

### preflightCheckNamespaces

• `Private` **preflightCheckNamespaces**: `any`

Pre-flight check to ensure that a multi-namespace object exists in the current namespace.

#### Defined in

src/core/target/types/server/saved_objects/service/lib/repository.d.ts:451

___

### rawDocExistsInNamespace

• `Private` **rawDocExistsInNamespace**: `any`

#### Defined in

src/core/target/types/server/saved_objects/service/lib/repository.d.ts:447

___

### rawDocExistsInNamespaces

• `Private` **rawDocExistsInNamespaces**: `any`

#### Defined in

src/core/target/types/server/saved_objects/service/lib/repository.d.ts:446

___

### validateInitialNamespaces

• `Private` **validateInitialNamespaces**: `any`

The `initialNamespaces` field (create, bulkCreate) is used to create an object in an initial set of spaces.

#### Defined in

src/core/target/types/server/saved_objects/service/lib/repository.d.ts:457

___

### validateObjectAttributes

• `Private` **validateObjectAttributes**: `any`

Validate a migrated doc against the registered saved object type's schema.

#### Defined in

src/core/target/types/server/saved_objects/service/lib/repository.d.ts:461

___

### validateObjectNamespaces

• `Private` **validateObjectNamespaces**: `any`

The object-specific `namespaces` field (bulkGet) is used to check if an object exists in any of a given number of spaces.

#### Defined in

src/core/target/types/server/saved_objects/service/lib/repository.d.ts:459

## Methods

### bulkCreate

▸ **bulkCreate**<`T`\>(`objects`, `options?`): `Promise`<[`SavedObjectsBulkResponse`](../interfaces/client.__internalNamespace.SavedObjectsBulkResponse.md)<`T`\>\>

Creates multiple documents at once

**`property`** {boolean} [options.overwrite=false] - overwrites existing documents

**`property`** {string} [options.namespace]

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | `unknown` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `objects` | [`SavedObjectsBulkCreateObject`](../interfaces/client.__internalNamespace.SavedObjectsBulkCreateObject.md)<`T`\>[] | [{ type, id, attributes, references, migrationVersion }] |
| `options?` | [`SavedObjectsCreateOptions`](../interfaces/client.__internalNamespace.SavedObjectsCreateOptions.md) | - |

#### Returns

`Promise`<[`SavedObjectsBulkResponse`](../interfaces/client.__internalNamespace.SavedObjectsBulkResponse.md)<`T`\>\>

-  {saved_objects: [[{ id, type, version, references, attributes, error: { message } }]}

#### Defined in

src/core/target/types/server/saved_objects/service/lib/repository.d.ts:112

___

### bulkGet

▸ **bulkGet**<`T`\>(`objects?`, `options?`): `Promise`<[`SavedObjectsBulkResponse`](../interfaces/client.__internalNamespace.SavedObjectsBulkResponse.md)<`T`\>\>

Returns an array of objects by id

**`property`** {string} [options.namespace]

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
| `objects?` | [`SavedObjectsBulkGetObject`](../interfaces/client.__internalNamespace.SavedObjectsBulkGetObject.md)[] | an array of objects containing id, type and optionally fields |
| `options?` | [`SavedObjectsBaseOptions`](../interfaces/client.__internalNamespace.SavedObjectsBaseOptions.md) | - |

#### Returns

`Promise`<[`SavedObjectsBulkResponse`](../interfaces/client.__internalNamespace.SavedObjectsBulkResponse.md)<`T`\>\>

- { saved_objects: [{ id, type, version, attributes }] }

#### Defined in

src/core/target/types/server/saved_objects/service/lib/repository.d.ts:169

___

### bulkResolve

▸ **bulkResolve**<`T`\>(`objects`, `options?`): `Promise`<[`SavedObjectsBulkResolveResponse`](../interfaces/client.__internalNamespace.SavedObjectsBulkResolveResponse.md)<`T`\>\>

Resolves an array of objects by id, using any legacy URL aliases if they exist

**`property`** {string} [options.namespace]

**`example`**

bulkResolve([
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
| `objects` | [`SavedObjectsBulkResolveObject`](../interfaces/client.__internalNamespace.SavedObjectsBulkResolveObject.md)[] | an array of objects containing id, type |
| `options?` | [`SavedObjectsBaseOptions`](../interfaces/client.__internalNamespace.SavedObjectsBaseOptions.md) | - |

#### Returns

`Promise`<[`SavedObjectsBulkResolveResponse`](../interfaces/client.__internalNamespace.SavedObjectsBulkResolveResponse.md)<`T`\>\>

- { resolved_objects: [{ saved_object, outcome }] }

#### Defined in

src/core/target/types/server/saved_objects/service/lib/repository.d.ts:184

___

### bulkUpdate

▸ **bulkUpdate**<`T`\>(`objects`, `options?`): `Promise`<[`SavedObjectsBulkUpdateResponse`](../interfaces/client.__internalNamespace.SavedObjectsBulkUpdateResponse.md)<`T`\>\>

Updates multiple objects in bulk

**`property`** {string} options.version - ensures version matches that of persisted object

**`property`** {string} [options.namespace]

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | `unknown` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `objects` | [`SavedObjectsBulkUpdateObject`](../interfaces/client.__internalNamespace.SavedObjectsBulkUpdateObject.md)<`T`\>[] | [{ type, id, attributes, options: { version, namespace } references }] |
| `options?` | [`SavedObjectsBulkUpdateOptions`](../interfaces/client.__internalNamespace.SavedObjectsBulkUpdateOptions.md) | - |

#### Returns

`Promise`<[`SavedObjectsBulkUpdateResponse`](../interfaces/client.__internalNamespace.SavedObjectsBulkUpdateResponse.md)<`T`\>\>

-  {saved_objects: [[{ id, type, version, references, attributes, error: { message } }]}

#### Defined in

src/core/target/types/server/saved_objects/service/lib/repository.d.ts:241

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

src/core/target/types/server/saved_objects/service/lib/repository.d.ts:117

___

### closePointInTime

▸ **closePointInTime**(`id`, `options?`): `Promise`<[`SavedObjectsClosePointInTimeResponse`](../interfaces/client.__internalNamespace.SavedObjectsClosePointInTimeResponse.md)\>

Closes a Point In Time (PIT) by ID. This simply proxies the request to ES
via the Elasticsearch client, and is included in the Saved Objects Client
as a convenience for consumers who are using `openPointInTimeForType`.

Only use this API if you have an advanced use case that's not solved by the
[SavedObjectsRepository.createPointInTimeFinder](client.__internalNamespace.SavedObjectsRepository.md#createpointintimefinder) method.

**`remarks`**
While the `keepAlive` that is provided will cause a PIT to automatically close,
it is highly recommended to explicitly close a PIT when you are done with it
in order to avoid consuming unneeded resources in Elasticsearch.

**`example`**
```ts
const repository = coreStart.savedObjects.createInternalRepository();

const { id } = await repository.openPointInTimeForType(
  type: 'index-pattern',
  { keepAlive: '2m' },
);

const response = await repository.find({
  type: 'index-pattern',
  search: 'foo*',
  sortField: 'name',
  sortOrder: 'desc',
  pit: {
    id: 'abc123',
    keepAlive: '2m',
  },
  searchAfter: [1234, 'abcd'],
});

await repository.closePointInTime(response.pit_id);
```

#### Parameters

| Name | Type |
| :------ | :------ |
| `id` | `string` |
| `options?` | [`SavedObjectsBaseOptions`](../interfaces/client.__internalNamespace.SavedObjectsBaseOptions.md) |

#### Returns

`Promise`<[`SavedObjectsClosePointInTimeResponse`](../interfaces/client.__internalNamespace.SavedObjectsClosePointInTimeResponse.md)\>

- [SavedObjectsClosePointInTimeResponse](../interfaces/client.__internalNamespace.SavedObjectsClosePointInTimeResponse.md)

#### Defined in

src/core/target/types/server/saved_objects/service/lib/repository.d.ts:384

___

### collectMultiNamespaceReferences

▸ **collectMultiNamespaceReferences**(`objects`, `options?`): `Promise`<[`SavedObjectsCollectMultiNamespaceReferencesResponse`](../interfaces/client.__internalNamespace.SavedObjectsCollectMultiNamespaceReferencesResponse.md)\>

Gets all references and transitive references of the given objects. Ignores any object and/or reference that is not a multi-namespace
type.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `objects` | [`SavedObjectsCollectMultiNamespaceReferencesObject`](../interfaces/client.__internalNamespace.SavedObjectsCollectMultiNamespaceReferencesObject.md)[] | The objects to get the references for. |
| `options?` | [`SavedObjectsCollectMultiNamespaceReferencesOptions`](../interfaces/client.__internalNamespace.SavedObjectsCollectMultiNamespaceReferencesOptions.md) | - |

#### Returns

`Promise`<[`SavedObjectsCollectMultiNamespaceReferencesResponse`](../interfaces/client.__internalNamespace.SavedObjectsCollectMultiNamespaceReferencesResponse.md)\>

#### Defined in

src/core/target/types/server/saved_objects/service/lib/repository.d.ts:223

___

### create

▸ **create**<`T`\>(`type`, `attributes`, `options?`): `Promise`<[`SavedObject`](../interfaces/client.__internalNamespace.SavedObject.md)<`T`\>\>

Persists an object

**`property`** {string} [options.id] - force id on creation, not recommended

**`property`** {boolean} [options.overwrite=false]

**`property`** {object} [options.migrationVersion=undefined]

**`property`** {string} [options.namespace]

**`property`** {array} [options.references=[]] - [{ name, type, id }]

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

- { id, type, version, attributes }

#### Defined in

src/core/target/types/server/saved_objects/service/lib/repository.d.ts:102

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

This generator wraps calls to [SavedObjectsRepository.find](client.__internalNamespace.SavedObjectsRepository.md#find) and
iterates over multiple pages of results using `_pit` and `search_after`.
This will open a new Point-In-Time (PIT), and continue paging until a
set of results is received that's smaller than the designated `perPage`.

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

src/core/target/types/server/saved_objects/service/lib/repository.d.ts:430

___

### delete

▸ **delete**(`type`, `id`, `options?`): `Promise`<{}\>

Deletes an object

**`property`** {string} [options.namespace]

#### Parameters

| Name | Type |
| :------ | :------ |
| `type` | `string` |
| `id` | `string` |
| `options?` | [`SavedObjectsDeleteOptions`](../interfaces/client.__internalNamespace.SavedObjectsDeleteOptions.md) |

#### Returns

`Promise`<{}\>

#### Defined in

src/core/target/types/server/saved_objects/service/lib/repository.d.ts:127

___

### deleteByNamespace

▸ **deleteByNamespace**(`namespace`, `options?`): `Promise`<`any`\>

Deletes all objects from the provided namespace.

#### Parameters

| Name | Type |
| :------ | :------ |
| `namespace` | `string` |
| `options?` | [`SavedObjectsDeleteByNamespaceOptions`](../interfaces/client.__internalNamespace.SavedObjectsDeleteByNamespaceOptions.md) |

#### Returns

`Promise`<`any`\>

- { took, timed_out, total, deleted, batches, version_conflicts, noops, retries, failures }

#### Defined in

src/core/target/types/server/saved_objects/service/lib/repository.d.ts:134

___

### find

▸ **find**<`T`, `A`\>(`options`): `Promise`<[`SavedObjectsFindResponse`](../interfaces/client.__internalNamespace.SavedObjectsFindResponse.md)<`T`, `A`\>\>

**`property`** {(string|Array<string>)} [options.type]

**`property`** {string} [options.search]

**`property`** {string} [options.defaultSearchOperator]

**`property`** {Array<string>} [options.searchFields] - see Elasticsearch Simple Query String
                                       Query field argument for more information

**`property`** {integer} [options.page=1]

**`property`** {integer} [options.perPage=20]

**`property`** {Array<unknown>} [options.searchAfter]

**`property`** {string} [options.sortField]

**`property`** {string} [options.sortOrder]

**`property`** {Array<string>} [options.fields]

**`property`** {string} [options.namespace]

**`property`** {object} [options.hasReference] - { type, id }

**`property`** {string} [options.pit]

**`property`** {string} [options.preference]

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

- { saved_objects: [{ id, type, version, attributes }], total, per_page, page }

#### Defined in

src/core/target/types/server/saved_objects/service/lib/repository.d.ts:154

___

### get

▸ **get**<`T`\>(`type`, `id`, `options?`): `Promise`<[`SavedObject`](../interfaces/client.__internalNamespace.SavedObject.md)<`T`\>\>

Gets a single object

**`property`** {string} [options.namespace]

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | `unknown` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `type` | `string` |
| `id` | `string` |
| `options?` | [`SavedObjectsBaseOptions`](../interfaces/client.__internalNamespace.SavedObjectsBaseOptions.md) |

#### Returns

`Promise`<[`SavedObject`](../interfaces/client.__internalNamespace.SavedObject.md)<`T`\>\>

- { id, type, version, attributes }

#### Defined in

src/core/target/types/server/saved_objects/service/lib/repository.d.ts:194

___

### incrementCounter

▸ **incrementCounter**<`T`\>(`type`, `id`, `counterFields`, `options?`): `Promise`<[`SavedObject`](../interfaces/client.__internalNamespace.SavedObject.md)<`T`\>\>

Increments all the specified counter fields (by one by default). Creates the document
if one doesn't exist for the given id.

**`remarks`**
When supplying a field name like `stats.api.counter` the field name will
be used as-is to create a document like:
  `{attributes: {'stats.api.counter': 1}}`
It will not create a nested structure like:
  `{attributes: {stats: {api: {counter: 1}}}}`

When using incrementCounter for collecting usage data, you need to ensure
that usage collection happens on a best-effort basis and doesn't
negatively affect your plugin or users. See https://github.com/elastic/kibana/blob/main/src/plugins/usage_collection/README.mdx#tracking-interactions-with-incrementcounter)

**`example`**
```ts
const repository = coreStart.savedObjects.createInternalRepository();

// Initialize all fields to 0
repository
  .incrementCounter('dashboard_counter_type', 'counter_id', [
    'stats.apiCalls',
    'stats.sampleDataInstalled',
  ], {initialize: true});

// Increment the apiCalls field counter
repository
  .incrementCounter('dashboard_counter_type', 'counter_id', [
    'stats.apiCalls',
  ])

// Increment the apiCalls field counter by 4
repository
  .incrementCounter('dashboard_counter_type', 'counter_id', [
    { fieldName: 'stats.apiCalls' incrementBy: 4 },
  ])

// Initialize the document with arbitrary fields if not present
repository.incrementCounter<{ appId: string }>(
  'dashboard_counter_type',
  'counter_id',
  [ 'stats.apiCalls'],
  { upsertAttributes: { appId: 'myId' } }
)
```

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | `unknown` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `type` | `string` | The type of saved object whose fields should be incremented |
| `id` | `string` | The id of the document whose fields should be incremented |
| `counterFields` | (`string` \| [`SavedObjectsIncrementCounterField`](../interfaces/client.__internalNamespace.SavedObjectsIncrementCounterField.md))[] | An array of field names to increment or an array of [SavedObjectsIncrementCounterField](../interfaces/client.__internalNamespace.SavedObjectsIncrementCounterField.md) |
| `options?` | [`SavedObjectsIncrementCounterOptions`](../interfaces/client.__internalNamespace.SavedObjectsIncrementCounterOptions.md)<`T`\> | [SavedObjectsIncrementCounterOptions](../interfaces/client.__internalNamespace.SavedObjectsIncrementCounterOptions.md) |

#### Returns

`Promise`<[`SavedObject`](../interfaces/client.__internalNamespace.SavedObject.md)<`T`\>\>

The saved object after the specified fields were incremented

#### Defined in

src/core/target/types/server/saved_objects/service/lib/repository.d.ts:303

___

### openPointInTimeForType

▸ **openPointInTimeForType**(`type`, `[options]?`): `Promise`<[`SavedObjectsOpenPointInTimeResponse`](../interfaces/client.__internalNamespace.SavedObjectsOpenPointInTimeResponse.md)\>

Opens a Point In Time (PIT) against the indices for the specified Saved Object types.
The returned `id` can then be passed to `SavedObjects.find` to search against that PIT.

Only use this API if you have an advanced use case that's not solved by the
[SavedObjectsRepository.createPointInTimeFinder](client.__internalNamespace.SavedObjectsRepository.md#createpointintimefinder) method.

**`example`**
```ts
const { id } = await savedObjectsClient.openPointInTimeForType(
  type: 'visualization',
  { keepAlive: '5m' },
);
const page1 = await savedObjectsClient.find({
  type: 'visualization',
  sortField: 'updated_at',
  sortOrder: 'asc',
  pit: { id, keepAlive: '2m' },
});
const lastHit = page1.saved_objects[page1.saved_objects.length - 1];
const page2 = await savedObjectsClient.find({
  type: 'visualization',
  sortField: 'updated_at',
  sortOrder: 'asc',
  pit: { id: page1.pit_id },
  searchAfter: lastHit.sort,
});
await savedObjectsClient.closePointInTime(page2.pit_id);
```

**`property`** {string} [options.keepAlive]

**`property`** {string} [options.preference]

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `type` | `string` \| `string`[] |  |
| `[options]?` | [`SavedObjectsOpenPointInTimeOptions`](../interfaces/client.__internalNamespace.SavedObjectsOpenPointInTimeOptions.md) | [SavedObjectsOpenPointInTimeOptions](../interfaces/client.__internalNamespace.SavedObjectsOpenPointInTimeOptions.md) |

#### Returns

`Promise`<[`SavedObjectsOpenPointInTimeResponse`](../interfaces/client.__internalNamespace.SavedObjectsOpenPointInTimeResponse.md)\>

- { id: string }

#### Defined in

src/core/target/types/server/saved_objects/service/lib/repository.d.ts:342

___

### removeReferencesTo

▸ **removeReferencesTo**(`type`, `id`, `options?`): `Promise`<[`SavedObjectsRemoveReferencesToResponse`](../interfaces/client.__internalNamespace.SavedObjectsRemoveReferencesToResponse.md)\>

Updates all objects containing a reference to the given {type, id} tuple to remove the said reference.

**`remarks`** Will throw a conflict error if the `update_by_query` operation returns any failure. In that case
         some references might have been removed, and some were not. It is the caller's responsibility
         to handle and fix this situation if it was to happen.

#### Parameters

| Name | Type |
| :------ | :------ |
| `type` | `string` |
| `id` | `string` |
| `options?` | [`SavedObjectsRemoveReferencesToOptions`](../interfaces/client.__internalNamespace.SavedObjectsRemoveReferencesToOptions.md) |

#### Returns

`Promise`<[`SavedObjectsRemoveReferencesToResponse`](../interfaces/client.__internalNamespace.SavedObjectsRemoveReferencesToResponse.md)\>

#### Defined in

src/core/target/types/server/saved_objects/service/lib/repository.d.ts:249

___

### resolve

▸ **resolve**<`T`\>(`type`, `id`, `options?`): `Promise`<[`SavedObjectsResolveResponse`](../interfaces/client.__internalNamespace.SavedObjectsResolveResponse.md)<`T`\>\>

Resolves a single object, using any legacy URL alias if it exists

**`property`** {string} [options.namespace]

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | `unknown` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `type` | `string` |
| `id` | `string` |
| `options?` | [`SavedObjectsBaseOptions`](../interfaces/client.__internalNamespace.SavedObjectsBaseOptions.md) |

#### Returns

`Promise`<[`SavedObjectsResolveResponse`](../interfaces/client.__internalNamespace.SavedObjectsResolveResponse.md)<`T`\>\>

- { saved_object, outcome }

#### Defined in

src/core/target/types/server/saved_objects/service/lib/repository.d.ts:204

___

### update

▸ **update**<`T`\>(`type`, `id`, `attributes`, `options?`): `Promise`<[`SavedObjectsUpdateResponse`](../interfaces/client.__internalNamespace.SavedObjectsUpdateResponse.md)<`T`\>\>

Updates an object

**`property`** {string} options.version - ensures version matches that of persisted object

**`property`** {string} [options.namespace]

**`property`** {array} [options.references] - [{ name, type, id }]

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

src/core/target/types/server/saved_objects/service/lib/repository.d.ts:216

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

src/core/target/types/server/saved_objects/service/lib/repository.d.ts:232

___

### createRepository

▸ `Static` **createRepository**(`migrator`, `typeRegistry`, `indexName`, `client`, `logger`, `includedHiddenTypes?`, `injectedConstructor?`): [`ISavedObjectsRepository`](../modules/client.__internalNamespace.md#isavedobjectsrepository)

A factory function for creating SavedObjectRepository instances.

**`internalremarks`**
Tests are located in ./repository_create_repository.test.ts

**`internal`**

#### Parameters

| Name | Type |
| :------ | :------ |
| `migrator` | [`IKibanaMigrator`](../modules/client.__internalNamespace.md#ikibanamigrator) |
| `typeRegistry` | [`ISavedObjectTypeRegistry`](../modules/client.__internalNamespace.md#isavedobjecttyperegistry) |
| `indexName` | `string` |
| `client` | [`ElasticsearchClient`](../modules/client.__internalNamespace.md#elasticsearchclient) |
| `logger` | `Logger` |
| `includedHiddenTypes?` | `string`[] |
| `injectedConstructor?` | `any` |

#### Returns

[`ISavedObjectsRepository`](../modules/client.__internalNamespace.md#isavedobjectsrepository)

#### Defined in

src/core/target/types/server/saved_objects/service/lib/repository.d.ts:87
