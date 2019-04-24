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
            { id: '1', operation: { operator: 'column', field: 'timestamp' } }
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

Again it isn't desirable to merge the two tables somehow, because there will be holes in the resulting datatable because the columns don't match - not even the time dimension will match up, because alerts can happen anytime while the log buckets are daily and will always produce a data point at midnight.

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

# Defining the boundary between visualization and data source

The visualization plugin is the entity which knows how the shape of the data tables can and should look (in terms of which data types are allowed and how high the cardinality should be) and how the data tables are applied to the actual visualization renderer.

The datasource plugin is the entity which knows what fields can be used for what and how these fields can be manipulated. It also names the columns in the data table.

This means the visualization plugin is the caller and the database plugin is the callee (give me the datatable for the given specs, give me a default operation for the given field and type and cardinality constraints, ...)

The visualization plugin writes the datatable spec with the help of the datasource plugin by querying for suitable operations. Operations are a concern of the datasource, but where they are placed in the datatable spec is decided by the visualization extension.

These responsiblities result in the following interfaces:

```ts

interface DatatableSpec {
    id: string;
    datasourceRef: string;
    columns: DatatableSpecColumn[];
}

interface DatatableSpecColumn {
    id: string;
    isSegment: boolean;
    isMetric: boolean;
    dataType: 'string' | 'number' | 'boolean' | /* ... */;
    operation: DatatableOperation;
}

interface DatatableOperation {
    ref: any;
}

interface OperationConfiguratorProps {
    constraints: Constraints;
    currentOperation?: DatatableOperation;
    onChangeOperation: (newOperation: DatatableOperation) => void;
    removable?: boolean;
    onRemoveOperation: () => void;
}

interface DatasourceExtension {
    DataPanel: ComponentType;
    OperationConfigurator: ComponentType<OperationConfiguratorProps>;
    getPossibleOperations(constraints: Constraints, field?: Field): DatatableOperation[];
    getFields(constraints?: Constraints): Field[];
    isSpecValid(spec: DatatableSpec): boolean;
}

interface ConfigPanelProps {
    privateState: any;
    datatableSpec: DatatableSpec;
    datasource: DatasourceExtension;
    onChangePrivateState: (newState: any) => void;
    onChangeTableSpec: (newSpec: DatatableSpec) => void;
    getAlternatives: (spec: DatatableSpec) => Suggestion[];
    onApplySuggestion: (suggestion: Suggestion) => void;
}

interface Suggestion {
    tableSpec: DatatableSpec;
    privateState: any;
    title: string;
    extensionId: string;
}

interface VisualizationExtension {
    ConfigPanel: ComponentType<ConfigPanelProps>;
    getInitialPrivateState(datatableSpec: DatatableSpec, currentPrivateState?: any): any;
    getAlternatives: (datasource: DatasourceExtension, spec: DatatableSpec): Suggestion[];
    getSuggestionsForField: (datasource: DatasourceExtension, spec: DatatableSpec, field: Field): Suggestion[];
}

```

Simplified code of an visualization extension:

```tsx

const LineChart: VisualizationExtension = {
    ConfigPanel({ privateState, datatableSpec, datasource, onChangePrivateState, onChangeTableSpec, getAlternatives, onApplySuggestion }) {
        const OperationConfigurator = datasource.OperationConfiguraor;
        const primaryTable = datatableSpec[0];
        const secondaryTable = datatableSpec[1];

        const [xAxis, setXAxis] = getColumn(primaryTable, 0);
        const [yAxes, setYAxis, removeYAxis] = getNColumns(primaryTable, 1);
        const [annotationAxis, setAnnotationAxis] = getColumn(secondaryTable, 0);

        return (<>
            <p>x axis</p>
            <OperationConfigurator constraints={{ cardinality: 'some', type: ['string', 'number', 'date'] }} currentOperation={xAxis} onChangeOperation={(newOperation) => {
                onChangeTableSpec(setXAxis(newOperation));
            }}>
            {yAxes.map((yAxis, index) => (<><p>x axis</p>
                <OperationConfigurator
                    constraints={{ cardinality: 'many', type: ['number'] }}
                    currentOperation={yAxis}
                    onChangeOperation={(newOperation) => {
                        onChangeTableSpec(setYAxes(index, newOperation));
                    }}
                    removable
                    onRemoveOperation={() => {
                        const updatedTableSpec = removeYAxis(index);
                        if (yAxes.length === 1) {
                            // last y axis was deleted, handoff to top editor
                            onApplySuggestion(getAlternatives(updatedTableSpec)[0]);
                        } else {
                            onChangeTableSpec(updatedTableSpec);
                        }
                    }}
                />
            )
            {secondaryTable && 
                <><p>Annotations</p>
                    <OperationConfigurator constraints={{ cardinality: 'many', type: [xAxis.dataType] }} currentOperation={annotationAxis} onChangeOperation={(newOperation) => {
                        onChangeTableSpec(setAnnotationAxis(newOperation));
                    }}>
                </>
            }
            </>}
        </>);
    },
    getAlternatives(datasource, spec) {
        // check whether the current spec makes sense with this chart
        // this could also use an elaborate suggestion mechanism like compassql
        const isSuitable = checkInOrder(
            () => spec.length === 1,
            () => spec[0].columns.length === 2,
            () => spec[0].columns[0].isSegment,
            () => spec[0].columns[1].isMetric
        );
        
        if (!isSuitable) {
            return [];
        }

        return [{
            tableSpec: spec,
            privateState: { type: 'line' },
            title: 'Basic line chart'
        }];
    },
    getSuggestionsForField(datasource, spec, field) {
        // check whether the current spec makes sense with this chart
        // this could also use an elaborate suggestion mechanism like compassql
        const isSuitable = checkInOrder(
            () => spec.length === 1,
            () => spec[0].columns.length === 1,
            () => spec[0].columns[0].isMetric
        );
        
        if (!isSuitable) {
            return [];
        }

        return [{
            tableSpec: addColumn(spec, datasource.getPossibleOperations({ cardinality: 'some', type: ['string', 'number', 'date'] }, field)[0]),
            privateState: { type: 'line' },
            title: 'Basic line chart'
        }];
    }
}

```