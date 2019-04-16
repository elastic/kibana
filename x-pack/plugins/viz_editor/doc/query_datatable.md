# Datasource visualization interaction

In our current POC it is unclear how the "query" maps to the datatables which are passed through the resulting expression. This is a proposal on how to align this by the query being nothing more than a description of multiple datatables (merging informations of datasource capabilities by using a set of helper functions):

```ts
interface VisModel {
    // ...
    datatableSpecs: DatatableSpec[];
    // ...
}

interface DatatableSpec {
    id: string;
    datasourceRef: string;
    columns: DatatableSpecColumn[];
}

interface DatatableSpecColumn {
    id: string;
    name: string;
    operation: DatatableOperation;
}

type DatatableOperation = 
  | DateHistogramOperation
  | SumOperation
  /* ... */;

```

This is basically our current data structure, but by renaming the types it is made clear that each operation operation produces a new column. The `datatableSpecs` array is written by the visualization plugin and read by the datasource plugin to actually query the data.

## Multiple tables

Because `datatables` is an array, the primary datastructure which get's passed through the expression isn't a single table but a list of tables. Each editor is aware of that and always operates on the logical concepts of multiple tables. For some simpler visualization types this means that only the first table is considered and used at all (can be expressed on the expression by a `take_first` function). There is no notion of merging or joining tables, if a visualization requires that in some way, it is part of this specific visualization configuration, and not a top level concept which is imposed on all visualization plugins.

The reason for this is that in the most common use cases for multiple tables, there is no need for joining the tables and in most cases it isn't even possible to do so in a meaningful way.

### Multiple index patterns as multiple y axes

A use case for multiple datatables is to display two series from different index patterns in a single line chart. This can be expressed by two datatable specs which define two separate tables like this:

```ts
// comparing the ticket price and the activity on the website over time
const datatableSpecs: [
    { 
        id: '1',
        datasourceRef: 'flights*',
        columns: [
            { id: '1', operation: { operator: 'date_histogram', field: 'flight_date', interval: '6h' } },
            { id: '2', operation: { operator: 'avg', field: 'ticket_price' } },
        ]
    },
    { 
        id: '2',
        datasourceRef: 'logs*',
        columns: [
            { id: '1', operation: { operator: 'date_histogram', field: 'timestamp', interval: 'd' } },
            { id: '2', operation: { operator: 'count' } },
        ]
    }
]
```

This produces two datatables which is exactly what can be passed to an elastic-charts configuration:

```tsx
<Chart>
    <LineSeries data={config.tables[0]} />
    <LineSeries data={config.tables[1]} />
</Chart>
```

Note that somehow merging these tables along the time dimension would have produced an incomplete table with holes in it because the time interval is more detailed for the flights index pattern (this might be the case when `logs*` contains rollup indices). elastic-charts can handle this, giving more flexibility. Note that the XY visualization plugin is responsible for restricting the user to not use a completely different operation for the X axes of the individual tables (e.g. terms), because this restriction is only revelant if the various tables are displayed in a single XY chart. Another visualization might not impose this restriction.

### Annotations

Another use case are annotations as currently implemented in TSVB. By using multiple datatables this can be expressed like this:

```ts
// showing annotations from an alerting index
const datatableSpecs: [
    { 
        id: '1',
        datasourceRef: 'logs*',
        columns: [
            { id: '1', operation: { operator: 'date_histogram', field: 'timestamp', interval: 'd' } },
            { id: '2', operation: { operator: 'count' } },
        ]
    },
    { 
        id: '2',
        datasourceRef: 'alerts*',
        columns: [
            { id: '1', operation: { operator: 'column', field: 'timestamp' } },
            { id: '2', operation: { operator: 'column', field: 'reason' } },
        ]
    }
]
```

This produces two datatables which can be passed to an elastic-charts spec in a similar eay as in the example above:

```tsx
<Chart>
    <LineSeries data={config.tables[0]} />
    <LineAnnotation dataValues={config.tables[1]} />
</Chart>
```

Again it isn't desirable to merge the two tables somehow, because there will be holes in the resulting datatable because the columns don't match - not even the time dimension willhh match up, because alerts can happen anyt9ime while the log buckets are daily and will always produce a data point at midnight.

### Displaying additional global information

A use case we talked a lot about is to show an additional bar with a global average value together with something like top 5 values. This might look like a use case to merge tables by rows, but from a data modeling perspective it makes much more sense to display this global value as a horizontal line, which basically comes down to another type of annotation.

The datatable spec could look like this:

```ts
// showing top 5 songs + global average
const datatableSpecs: [
    { 
        id: '1',
        datasourceRef: 'plays*',
        columns: [
            { id: '1', operation: { operator: 'terms', size: 5, field: 'song', orderBy: { operator: 'count' } } },
            { id: '2', operation: { operator: 'count' } },
        ]
    },
    { 
        id: '2',
        datasourceRef: 'plays*',
        columns: [
            {
                id: '1',
                operation: { 
                    operator: 'avg_bucket', // TODO probably find a better name for this 
                    field: { operator: 'terms', size: 5, field: 'song', orderBy: { operator: 'count' } }
                }
            },
        ]
    }
]
```

This produces two datatables , the second one being just a single column and a singl row. It can be passed into elastic-charts like this:

```tsx
<Chart>
    <LineSeries data={config.tables[0]} />
    <LineAnnotation dataValues={config.tables[1]} domainType={AnnotationDomainTypes.YDomain} />
</Chart>
```

## Treating manual table building as a special case

Of course the examples above are not exhaustive and there definitely are some cases where it makes sense to join multiple tables into a single table, but since coming up with an example was really hard (at least for me),  I think this is an edge case which doesn't have to be a first class citizen in our architecture. We can make something like this possible by prodiving a `tablebuilder` datasource which encapsules this logic in the datasource itself and just presents the resulting fields as non-aggregatable fields to the visualization plugins which will work on this opaque source by simply "requesting" individual columns from it:

```ts

const visModel = {
    datsourcePlugin: 'tablebuilder',
    datasource: {
        meta: { // this is custom configuration encapsuled by tablebuilder and isn't editable by any other piece of code
            sheets: [
                { type: 'esaggs', aggs: [{ type: 'date_histogram', /*...*/ }] },
                { type: 'essql', sql: 'SELECT timestamp, ...' },
                /* ... */
            ],
            joins: [{ type: 'column', columns: ['col-0-1', 'timestamp'] }]
        },
        fields: [ // these are calculated based on the definition in `meta`
            { type: 'date', name: 'joined_date', aggregatable: false, datasourceRef: 'tablebuilder_result' },
            { type: 'number', name: 'aggs_value', aggregatable: false, datasourceRef: 'tablebuilder_result' },
            { type: 'number', name: 'sql_value', aggregatable: false, datasourceRef: 'tablebuilder_result' },
        ]
    },
    datatableSpecs: [
        { 
            id: '1',
            datasourceRef: 'tablebuilder_result',
            columns: [
                { id: '1', operation: { operator: 'column', field: 'joined_date' },
                { id: '2', operation: { operator: 'column', field: 'sql_value' },
            ]
        }
    ]
};

```

The editors don't know how the fields got created, but because of the `aggregatable` flag they can only use the column operation. Matching fields with "slots" in the current visualization works as it used to with more complicated datatable specs, it's just not possible anymore to use complex operation configurations in the visualization plugin. This basically separates the data modeling and the visualization phase from a user perspective, but doesn't hurt the flexibility of the model to interweave these steps for an easier user experience.

## Working with the datatable spec

If a visualization plugin accesses and modifies the datatable spec, it requires additional information about the columns aside from the operation and the used fields - what the resulting data type will be and whether it will be a `segment` (a value which can be used to group rows in some way) or a `metric` (a value which can't be used for grouping but is a property of each given row, mostly numeric). The information about the used operation and the fields of the current datasource are sufficient to infer this information, so it doesn't make sense to store it separately. Instead the helper function `getTableTypes` can be used to get an enriched view on a given table:

```ts
interface ColumnType {
    dataType: 'string' | 'number' | 'boolean' | /* ... */;
    isMetric: boolean;
    isSegment: boolean;
}

declare getTableTypes(visModel: VisModel, tableId: string): ColumnType[];
```

A "raw" column is always a segment and a metric, because it might make sense to use it either way.