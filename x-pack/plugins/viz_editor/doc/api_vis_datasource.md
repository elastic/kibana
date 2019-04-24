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
        // check whether the current spec makes sense for this chart
        // this could also use an elaborate suggestion mechanism like compassql
        const isSuitable = checkInOrder(
            () => spec.length === 1 || spec.length === 2,
            () => spec[0].columns.length === 2,
            () => spec[0].columns[0].isSegment,
            () => spec[0].columns[1].isMetric,
            () => !spec[1] || spec[1].columns.length === 1,
            () => !spec[1] || spec[1].columns[0].isMetric && spec[1].columns[0].dataType === spec[0].columns[0].dataType,
        );
        
        if (!isSuitable) {
            return [];
        }

        return [{
            tableSpec: spec,
            privateState: { type: 'line' },
            title: spec.length === 1 ? 'Basic line chart' : 'Line chart with annotations'
        }];
    },
    getSuggestionsForField(datasource, spec, field) {
        // check whether the current spec + the new field makes sense for this chart
        // this could also use an elaborate suggestion mechanism like compassql or chris' matching engine
        const isSuitable = checkInOrder(
            () => spec.length === 1,
            () => spec[0].datasourceRef === field.datasourceRef,
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