Set of utilities for merging between `_source` and `fields` are within this folder as well as strategies for merging between these two.

See the `strategies` folder for the strategies for merging between `_source` and `fields`. See the `utils` folder for the different utilities
which the strategies utilize for help in building their merged documents.

The `strategies/merge_all_fields_with_source` strategy will try to merge as much from `fields` as it can into `_source`. This includes
  * Data in only `fields` such as `constant_keyword`, `copy_to`, `field alias`, etc...
  * It will try to merge data from `fields` into `_source` and overwrite `_source` when it can, which can include data coercion, or different overridden values from runtime fields, etc...
  * It will take non-multifield values such as `host.name` from `fields` instead of `host.name.keyword` and merge that as the truth data even though `_source` might have a different original value that is not preserved correctly in `fields` as its choice of which one to take.
  * If we run into problems such as ambiguities, uncertainties, or data type contradictions then we will prefer the value within `fields` if we can, but not in all cases.
  * It compares and unboxes arrays where it can.

The `strategies/merge_missing_fields_with_source` strategy is lighter weight and will only merge from `fields` into `_source` when it these conditions
  * The value in `_source` is missing but exists in `fields` such as a `constant_keyword`, `copy_to`, `field alias`, etc...
  * The value in `fields` is a primitive value and not a nested field or an object type such as a geo-point.
  * If we run into problems such as ambiguities, uncertainties, or data type contradictions, then the `fields` value is skipped altogether.

Hence, these are labeled as "best effort" since we could run into conditions where we should have taken the value from `fields` but instead did not and took the value from 
`_source`. If `fields` does not exist we return `_source` untouched as-is for all strategies. If `_source` does not exist but
`fields` does exist then we will do a "best effort" to merge `fields` into a fully functional object as
if it was a `_source` for `strategies/merge_all_fields_with_source` For `strategies/merge_missing_fields_with_source` we will only merge primitive values. In both
strategies if we run into contradictions or ambiguities from `fields` we will remove that field or omit one of the contradictions.

In all strategies If we find that a `field` contradicts the `_source` object in which we cannot create a regular
JSON such as a keyword trying to override an object or an object trying to override a keyword:

```
"fields": { 'foo': 'value_1', foo.bar': 'value_2' } <-- Foo cannot be both an object and a value
```

Then you will get an object such as
```
{ "foo": "value_1" }
```

We cannot merge both together as this is a contradiction and no longer capable of being a JSON object.
This happens when we have multiFields since multiFields are represented in fields as well as when runtime
fields tries to add multiple overrides or invalid multiFields.

Invalid field names such as ".", "..", ".foo", "foo.", ".foo." will be skipped as those cause errors if
we tried to insert them into Elasticsearch as a new field in all strategies

For `strategies/merge_all_fields_with_source` if we encounter an array within `_source` that contains
an object with more than 1 value and a "field" tries to add a new element we will not merge that in
as we do not know which array to merge that value into.

For `strategies/merge_all_fields_with_source` if we encounter a flattened array in the fields object which is not a nested fields such as:
```
"fields": { "object_name.first" : [ "foo", "bar" ], "object_name.second" : [ "mars", "bar" ] }
```

and no `_source` with the name `object_name`, the assumption is that we these are not related and we construct the object as this:
```
{ "object.name": { "first": ["foo", "bar" }, "second": ["mars", "bar"] }
```

For `strategies/merge_all_fields_with_source` if we detect a `_source` with a single flattened array sub objects we will prefer the `fields` flattened
array elements and copy them over as-is, which means we could be subtracting elements, adding elements, or
completely changing the items from the array.

For `strategies/merge_all_fields_with_source` if we detect an object within the `_source` inside of the array, we will not take anything from the
`fields` flattened array elements even if they exist as it is ambiguous where we would put those elements
within the ""doc._source" as an override.

It is best to feed these strategies both the `_source` and `fields` values to get the best chances of merging the document correctly.

Using both of these strategies will get you these value types merged that you would otherwise not get directly on your
```
"doc._source":
  - constant_keyword field
  - runtime fields
  - field aliases
  - copy_to
```

References:
---
 * https://www.elastic.co/guide/en/elasticsearch/reference/7.13/keyword.html#constant-keyword-field-type
 * https://www.elastic.co/guide/en/elasticsearch/reference/7.13/runtime.html
 * https://www.elastic.co/guide/en/elasticsearch/reference/7.13/search-fields.html

Ambiguities and issues
---
* geo data points/types and nested fields look the same.
* multi-fields such as `host.name` and `host.name.keyword` can lead to misinterpreting valid values vs multi-fields
* All data is an array with at least 1 value we call "boxed", meaning that it is difficult to determine if the user wanted the fields as an array or not.

Existing bugs and ambiguities
---
* For `strategies/merge_all_fields_with_source` we currently filter out the geo data points by looking at "type" on the object and filter it out. We could transform it to be valid input at some point.

Tests
---
Some tests in this folder use a special table and nomenclature in the comments to show the enumerations and tests for each type.

Key for the nomenclature is:
```
undefined means non-existent
p_[] means primitive key and empty array
p_p1 or p_p2 means primitive key and primitive value
p_[p1] or p_[p2] means primitive key and primitive array with a single array value
p[p1, ...1] or p[p2, ...2] means primitive array with 2 or more values
p_{}1 or p_{}2 means a primitive key with a single object
p_[{}1] or p_[{}2] means a primitive key with an array of exactly 1 object
p_[{}1, ...1] or p_[{}2, ...2] means a primitive key with 2 or more array elements
f_[] means a flattened object key and empty array
f_p1 or f_p2 means a flattened object key and a primitive value
f_[p1] or f_[p2] means a flattened object key and a single primitive value in an array
f_[p1, ...1] or f_[p2, ...2] means a flattened object key and 2 or more primitive values in an array
f_{}1 or f_{}2 means a flattened object key with 1 object
f_[{}1] or f_[{}2] means a flattened object key with a single object in a single array
f_[{}1, ...1] or f_[{}2, ...2] means a flattened object key with 2 or more objects in an array
```

`_source` documents can contain the following values:
```
undefined
p_[]
p_p1
p_[p1]
p_[p1, ...1]
p_{}1
p_[{}1]
p_[{}1, ...1]
f_[]
f_p1
f_[p1]
f_[p1, ...1]
f_{}1
f_[{}1]
f_[{}1, ...1]
```

`fields` arrays can contain the following values:
```
undefined
f_[]
f_[p2]
f_[p2, ...2]
f_[{}2]
f_[{}2, ...2]
```

When fields is undefined or empty array f_[] you never overwrite
the source and source is always the same as before the merge for all the strategies
```
source        | fields        | value after merge
-----         | ---------     | -----
undefined     | undefined     | undefined
undefined     | f_[]          | undefined
p_[]          | undefined     | p_[]
p_[]          | f_[]          | p_[]
p_p1          | undefined     | p_p1
p_p1          | f_[]          | p_p1
p_[p1]        | undefined     | p_[p1]
p_[p1]        | f_[]          | p_[p1]
p_[p1, ...1]  | undefined     | p_[p1, ...1]
p_[p1, ...1]  | f_[]          | p_[p1, ...1]
p_{}1         | undefined     | p_{}1
p_{}1         | f_[]          | p_{}1
p_[{}1]       | undefined     | p_{}1
p_[{}1]       | f_[]          | p_{}1
p_[{}1, ...1] | undefined     | p_[{}1, ...1]
p_[{}1, ...1] | f_[]          | p_[{}1, ...1]
f_[]          | undefined     | f_[]
f_[]          | f_[]          | f_[]
f_p1          | undefined     | f_p1
f_p1          | f_[]          | f_p1
f_[p1]        | undefined     | f_[p1]
f_[p1]        | f_[]          | f_[p1]
f_[p1, ...1]  | undefined     | f_[p1, ...1]
f_[p1, ...1]  | f_[]          | f_[p1, ...1]
f_{}1         | undefined     | f_{}1
f_{}1         | f_[]          | f_{}1
f_[{}1]       | undefined     | f_{}1
f_[{}1]       | f_[]          | f_{}1
f_[{}1, ...1] | undefined     | f_[{}1, ...1]
f_[{}1, ...1] | f_[]          | f_[{}1, ...1]
```

When source key and source value does not exist but field keys and values do exist, then you
you will always get field keys and values replacing the source key and value. Caveat is that
fields will create a single item rather than an array item if field keys and value only has a single
array element. Also, we prefer to create an object structure in source (e.x. p_p2 instead of a flattened object f_p2)
for the `merge_all_fields_with_source` strategy
```
source        | fields        | value after merge
-----         | ---------     | -----
undefined     | f_[p2]        | p_p2         <-- Unboxed from array
undefined     | f_[p2, ...2]  | p_[p2, ...2]
undefined     | f_[{}2]       | p_{}2        <-- Unboxed from array
undefined     | f_[{}2, ...2] | p_[{}2, ...2]
```

For the `merge_missing_fields_with_source` it will be that we completely skip the fields that contain nested
fields or type fields such as geo points.

```
source     | fields        | value after merge
-----      | ---------     | -----
undefined  | f_[p2]        | p_p2         <-- Unboxed from array
undefined  | f_[p2, ...2]  | p_[p2, ...2]
undefined  | f_[{}2]       | {}           <-- We have an empty object since we only merge primitives
undefined  | f_[{}2, ...2] | {}           <-- We have an empty object since we only merge primitives
```

For the `merge_all_fields_with_source` when source key is either a primitive key or a flattened object key with a primitive value (p_p1 or f_p1),
then we overwrite source value with fields value as an unboxed value array if fields value is a
single array element (f_[p2] or f[{}2]), otherwise we overwrite source as an array.

```
source        | fields        | value after merge
-----         | ---------     | -----
p_p1          | f_[p2]        | p_p2          <-- Unboxed from array
p_p1          | f_[p2, ...2]  | p_[p2, ...2]
p_p1          | f_[{}2]       | p_{}2         <-- Unboxed from array
p_p1          | f_[{}2, ...2] | p_[{}2, ...2]

f_p1          | f_[p2]        | f_p2          <-- Unboxed from array
f_p1          | f_[p2, ...2]  | f_[p2, ...2]
f_p1          | f_[{}2]       | f_{}2         <-- Unboxed from array
f_p1          | f_[{}2, ...2] | f_[{}2, ...2]
```

For both strategies none of these will be merged since the source has values such as

```
source        | fields        | value after merge
-----         | ---------     | -----
p_p1          | f_[p2]        | p_p1 
p_p1          | f_[p2, ...2]  | p_p1 
p_p1          | f_[{}2]       | p_p1 
p_p1          | f_[{}2, ...2] | p_p1 

f_p1          | f_[p2]        | f_p1
f_p1          | f_[p2, ...2]  | f_p1
f_p1          | f_[{}2]       | f_p1
f_p1          | f_[{}2, ...2] | f_p1
```

For the `merge_all_fields_with_source` when source key is a primitive key or a flattened object key and the source value is any
type of array (p_[], p_p[p1], or p_p[p1, ...1]) of primitives then we always copy the
fields value as is and keep the source key as it was originally (primitive or flattened)

```
source        | fields        | value after merge
-----         | ---------     | -----
p_[]          | f_[p2]        | p_[p2]
p_[]          | f_[p2, ...2]  | p_[p2, ...2]
p_[]          | f_[{}2]       | p_[{}2]
p_[]          | f_[{}2, ...2] | p_[{}2, ...2]

f_[]          | f_[p2]        | f_[p2]
f_[]          | f_[p2, ...2]  | f_[p2, ...2]
f_[]          | f_[{}2]       | f_[{}2]
f_[]          | f_[{}2, ...2] | f_[{}2, ...2]

p_[p1]        | f_[p2]        | p_[p2]
p_[p1]        | f_[p2, ...2]  | p_[p2, ...2]
p_[p1]        | f_[{}2]       | p_[{}2]
p_[p1]        | f_[{}2, ...2] | p_[{}2, ...2]

f_[p1]        | f_[p2]        | f_[p2]
f_[p1]        | f_[p2, ...2]  | f_[p2, ...2]
f_[p1]        | f_[{}2]       | f_{}2
f_[p1]        | f_[{}2, ...2] | f_[{}2, ...2]

p_[p1, ...1]  | f_[p2]        | p_[p2]
p_[p1, ...1]  | f_[p2, ...2]  | p_[p2, ...2]
p_[p1, ...1]  | f_[{}2]       | p_[{}2]
p_[p1, ...1]  | f_[{}2, ...2] | p_[{}2, ...2]

f_[p1, ...1]  | f_[p2]        | f_[p2]
f_[p1, ...1]  | f_[p2, ...2]  | f_[p2, ...2]
f_[p1, ...1]  | f_[{}2]       | f_[{}2]
f_[p1, ...1]  | f_[{}2, ...2] | f_[{}2, ...2]
```

For the `merge_missing_fields_with_source` none of these will be merged since the source has values such as

```
source        | fields        | value after merge
-----         | ---------     | -----
p_[]          | f_[p2]        | p_[]
p_[]          | f_[p2, ...2]  | p_[]
p_[]          | f_[{}2]       | p_[]
p_[]          | f_[{}2, ...2] | p_[]

f_[]          | f_[p2]        | f_[]
f_[]          | f_[p2, ...2]  | f_[]
f_[]          | f_[{}2]       | f_[]
f_[]          | f_[{}2, ...2] | f_[]

p_[p1]        | f_[p2]        | p_[p1]
p_[p1]        | f_[p2, ...2]  | p_[p1]
p_[p1]        | f_[{}2]       | p_[p1]
p_[p1]        | f_[{}2, ...2] | p_[p1]

f_[p1]        | f_[p2]        | f_[p1]
f_[p1]        | f_[p2, ...2]  | f_[p1]
f_[p1]        | f_[{}2]       | f_[p1]
f_[p1]        | f_[{}2, ...2] | f_[p1]

p_[p1, ...1]  | f_[p2]        | p_[p1, ...1]
p_[p1, ...1]  | f_[p2, ...2]  | p_[p1, ...1]
p_[p1, ...1]  | f_[{}2]       | p_[p1, ...1]
p_[p1, ...1]  | f_[{}2, ...2] | p_[p1, ...1]

f_[p1, ...1]  | f_[p2]        | f_[p1, ...1]
f_[p1, ...1]  | f_[p2, ...2]  | f_[p1, ...1]
f_[p1, ...1]  | f_[{}2]       | f_[p1, ...1]
f_[p1, ...1]  | f_[{}2, ...2] | f_[p1, ...1]
```

For the `merge_all_fields_with_source` when source key is a primitive key or flattened key and
the source value is an object (p_{}1, f_{}1) or an array containing objects ([p_{1}], f_{}1, p_[{}1, ...1],
f_[{}1, ...1]), we only copy the field value if we detect that field value is also an object meaning
that it is a nested field, (f_[{}]2 or f[{}2, ...2]). We never allow a field to convert an object back into a value.
We never try to merge field values into the array either since they're flattened in the fields and we
will have too many ambiguities and issues between the flattened array values and the source objects.

```
source        | fields        | value after merge
-----         | ---------     | -----
p_{}1         | f_[p2]        | p_{}1
p_{}1         | f_[p2, ...2]  | p_{}1
p_{}1         | f_[{}2]       | p_{}2         <-- Copied and unboxed array since we detected a nested field
p_{}1         | f_[{}2, ...2] | p_[{}2, ...2] <-- Copied since we detected a nested field

f_{}1         | f_[p2]        | f_{}1
f_{}1         | f_[p2, ...2]  | f_{}1
f_{}1         | f_[{}2]       | f_{}2         <-- Copied and unboxed array since we detected a nested field
f_{}1         | f_[{}2, ...2] | f_[{}2, ...2] <-- Copied since we detected a nested field

p_[{}1]       | f_[p2]        | p_[{}1]
p_[{}1]       | f_[p2, ...2]  | p_[{}1]
p_[{}1]       | f_[{}2]       | p_[{}2]       <-- Copied since we detected a nested field
p_[{}1]       | f_[{}2, ...2] | p_[{}2, ...2] <-- Copied since we detected a nested field

f_[{}1]       | f_[p2]        | f_[{}1]
f_[{}1]       | f_[p2, ...2]  | f_[{}1]
f_[{}1]       | f_[{}2]       | f_[{}2]       <-- Copied since we detected a nested field
f_[{}1]       | f_[{}2, ...2] | f_[{}2, ...2] <-- Copied since we detected a nested field

p_[{}1, ...1] | f_[p2]        | p_[{}1, ...1]
p_[{}1, ...1] | f_[p2, ...2]  | p_[{}1, ...1]
p_[{}1, ...1] | f_[{}2]       | p_[{}2]       <-- Copied since we detected a nested field
p_[{}1, ...1] | f_[{}2, ...2] | p_[{}2, ...2] <-- Copied since we detected a nested field

f_[{}1, ...1] | f_[p2]        | f_[{}1, ...1]
f_[{}1, ...1] | f_[p2, ...2]  | f_[{}1, ...1]
f_[{}1, ...1] | f_[{}2]       | f_[{}2]       <-- Copied since we detected a nested field
f_[{}1, ...1] | f_[{}2, ...2] | f_[{}2, ...2] <-- Copied since we detected a nested field
```

For the `merge_missing_fields_with_source` none of these will be merged since the source has values such as

```
source        | fields        | value after merge
-----         | ---------     | -----
p_{}1         | f_[p2]        | p_{}1
p_{}1         | f_[p2, ...2]  | p_{}1
p_{}1         | f_[{}2]       | p_{}1
p_{}1         | f_[{}2, ...2] | p_{}1

f_{}1         | f_[p2]        | f_{}1
f_{}1         | f_[p2, ...2]  | f_{}1
f_{}1         | f_[{}2]       | f_{}1
f_{}1         | f_[{}2, ...2] | f_{}1

p_[{}1]       | f_[p2]        | p_[{}1]
p_[{}1]       | f_[p2, ...2]  | p_[{}1]
p_[{}1]       | f_[{}2]       | p_[{}1]
p_[{}1]       | f_[{}2, ...2] | p_[{}1]

f_[{}1]       | f_[p2]        | f_[{}1]
f_[{}1]       | f_[p2, ...2]  | f_[{}1]
f_[{}1]       | f_[{}2]       | f_[{}1]
f_[{}1]       | f_[{}2, ...2] | f_[{}1] 

p_[{}1, ...1] | f_[p2]        | p_[{}1, ...1]
p_[{}1, ...1] | f_[p2, ...2]  | p_[{}1, ...1]
p_[{}1, ...1] | f_[{}2]       | p_[{}1, ...1]
p_[{}1, ...1] | f_[{}2, ...2] | p_[{}1, ...1]

f_[{}1, ...1] | f_[p2]        | f_[{}1, ...1]
f_[{}1, ...1] | f_[p2, ...2]  | f_[{}1, ...1]
f_[{}1, ...1] | f_[{}2]       | f_[{}1, ...1]
f_[{}1, ...1] | f_[{}2, ...2] | f_[{}1, ...1]
```
