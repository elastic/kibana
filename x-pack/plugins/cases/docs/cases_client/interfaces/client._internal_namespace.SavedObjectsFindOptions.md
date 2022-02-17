[Cases Client API Interface](../README.md) / [client](../modules/client.md) / [\_internal\_namespace](../modules/client._internal_namespace.md) / SavedObjectsFindOptions

# Interface: SavedObjectsFindOptions

[client](../modules/client.md).[_internal_namespace](../modules/client._internal_namespace.md).SavedObjectsFindOptions

## Table of contents

### Properties

- [aggs](client._internal_namespace.SavedObjectsFindOptions.md#aggs)
- [defaultSearchOperator](client._internal_namespace.SavedObjectsFindOptions.md#defaultsearchoperator)
- [fields](client._internal_namespace.SavedObjectsFindOptions.md#fields)
- [filter](client._internal_namespace.SavedObjectsFindOptions.md#filter)
- [hasReference](client._internal_namespace.SavedObjectsFindOptions.md#hasreference)
- [hasReferenceOperator](client._internal_namespace.SavedObjectsFindOptions.md#hasreferenceoperator)
- [namespaces](client._internal_namespace.SavedObjectsFindOptions.md#namespaces)
- [page](client._internal_namespace.SavedObjectsFindOptions.md#page)
- [perPage](client._internal_namespace.SavedObjectsFindOptions.md#perpage)
- [pit](client._internal_namespace.SavedObjectsFindOptions.md#pit)
- [preference](client._internal_namespace.SavedObjectsFindOptions.md#preference)
- [rootSearchFields](client._internal_namespace.SavedObjectsFindOptions.md#rootsearchfields)
- [search](client._internal_namespace.SavedObjectsFindOptions.md#search)
- [searchAfter](client._internal_namespace.SavedObjectsFindOptions.md#searchafter)
- [searchFields](client._internal_namespace.SavedObjectsFindOptions.md#searchfields)
- [sortField](client._internal_namespace.SavedObjectsFindOptions.md#sortfield)
- [sortOrder](client._internal_namespace.SavedObjectsFindOptions.md#sortorder)
- [type](client._internal_namespace.SavedObjectsFindOptions.md#type)
- [typeToNamespacesMap](client._internal_namespace.SavedObjectsFindOptions.md#typetonamespacesmap)

## Properties

### aggs

• `Optional` **aggs**: `Record`<`string`, `AggregationsAggregationContainer`\>

A record of aggregations to perform.
The API currently only supports a limited set of metrics and bucket aggregation types.
Additional aggregation types can be contributed to Core.

**`example`**
Aggregating on SO attribute field
```ts
const aggs = { latest_version: { max: { field: 'dashboard.attributes.version' } } };
return client.find({ type: 'dashboard', aggs })
```

**`example`**
Aggregating on SO root field
```ts
const aggs = { latest_update: { max: { field: 'dashboard.updated_at' } } };
return client.find({ type: 'dashboard', aggs })
```

**`alpha`**

#### Defined in

src/core/target/types/server/saved_objects/types.d.ts:103

___

### defaultSearchOperator

• `Optional` **defaultSearchOperator**: ``"AND"`` \| ``"OR"``

The search operator to use with the provided filter. Defaults to `OR`

#### Defined in

src/core/target/types/server/saved_objects/types.d.ts:80

___

### fields

• `Optional` **fields**: `string`[]

An array of fields to include in the results

**`example`**
SavedObjects.find({type: 'dashboard', fields: ['attributes.name', 'attributes.location']})

#### Defined in

src/core/target/types/server/saved_objects/types.d.ts:54

___

### filter

• `Optional` **filter**: `any`

#### Defined in

src/core/target/types/server/saved_objects/types.d.ts:81

___

### hasReference

• `Optional` **hasReference**: [`SavedObjectsFindOptionsReference`](client._internal_namespace.SavedObjectsFindOptionsReference.md) \| [`SavedObjectsFindOptionsReference`](client._internal_namespace.SavedObjectsFindOptionsReference.md)[]

Search for documents having a reference to the specified objects.
Use `hasReferenceOperator` to specify the operator to use when searching for multiple references.

#### Defined in

src/core/target/types/server/saved_objects/types.d.ts:72

___

### hasReferenceOperator

• `Optional` **hasReferenceOperator**: ``"AND"`` \| ``"OR"``

The operator to use when searching by multiple references using the `hasReference` option. Defaults to `OR`

#### Defined in

src/core/target/types/server/saved_objects/types.d.ts:76

___

### namespaces

• `Optional` **namespaces**: `string`[]

#### Defined in

src/core/target/types/server/saved_objects/types.d.ts:104

___

### page

• `Optional` **page**: `number`

#### Defined in

src/core/target/types/server/saved_objects/types.d.ts:45

___

### perPage

• `Optional` **perPage**: `number`

#### Defined in

src/core/target/types/server/saved_objects/types.d.ts:46

___

### pit

• `Optional` **pit**: [`SavedObjectsPitParams`](client._internal_namespace.SavedObjectsPitParams.md)

Search against a specific Point In Time (PIT) that you've opened with [SavedObjectsClient.openPointInTimeForType](../classes/client._internal_namespace.SavedObjectsClient.md#openpointintimefortype).

#### Defined in

src/core/target/types/server/saved_objects/types.d.ts:118

___

### preference

• `Optional` **preference**: `string`

An optional ES preference value to be used for the query

#### Defined in

src/core/target/types/server/saved_objects/types.d.ts:114

___

### rootSearchFields

• `Optional` **rootSearchFields**: `string`[]

The fields to perform the parsed query against. Unlike the `searchFields` argument, these are expected to be root fields and will not
be modified. If used in conjunction with `searchFields`, both are concatenated together.

#### Defined in

src/core/target/types/server/saved_objects/types.d.ts:67

___

### search

• `Optional` **search**: `string`

Search documents using the Elasticsearch Simple Query String syntax. See Elasticsearch Simple Query String `query` argument for more information

#### Defined in

src/core/target/types/server/saved_objects/types.d.ts:56

___

### searchAfter

• `Optional` **searchAfter**: `string`[]

Use the sort values from the previous page to retrieve the next page of results.

#### Defined in

src/core/target/types/server/saved_objects/types.d.ts:62

___

### searchFields

• `Optional` **searchFields**: `string`[]

The fields to perform the parsed query against. See Elasticsearch Simple Query String `fields` argument for more information

#### Defined in

src/core/target/types/server/saved_objects/types.d.ts:58

___

### sortField

• `Optional` **sortField**: `string`

#### Defined in

src/core/target/types/server/saved_objects/types.d.ts:47

___

### sortOrder

• `Optional` **sortOrder**: `SortOrder`

#### Defined in

src/core/target/types/server/saved_objects/types.d.ts:48

___

### type

• **type**: `string` \| `string`[]

#### Defined in

src/core/target/types/server/saved_objects/types.d.ts:44

___

### typeToNamespacesMap

• `Optional` **typeToNamespacesMap**: `Map`<`string`, `undefined` \| `string`[]\>

This map defines each type to search for, and the namespace(s) to search for the type in; this is only intended to be used by a saved
object client wrapper.
If this is defined, it supersedes the `type` and `namespaces` fields when building the Elasticsearch query.
Any types that are not included in this map will be excluded entirely.
If a type is included but its value is undefined, the operation will search for that type in the Default namespace.

#### Defined in

src/core/target/types/server/saved_objects/types.d.ts:112
