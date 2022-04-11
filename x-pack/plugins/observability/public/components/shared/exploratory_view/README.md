# Exploratory view component

This component is used in observability plugin to show lens embeddable based observability visualizations. 
The view is populated using configs stored as json within the view for each data type.

This readme file contains few of the concepts being used in the component.

Basic workflow for how exploratory view works, it looks like this


![Exploratory view workflow](https://i.imgur.com/Kgyfd29.png)


## Report Type

The exploratory view report type controls how the data is visualized in the lens embeddable. The report type defines a set of constraints over the x and y axis. For example, the `kpi-over-time` report type is a time series chart type that plots key performance indicators over time, while the `data-distribution` chart plots the percentage of documents over key performance indicators. Current available data types can be found at `exploratory_view/configurations/constants`.

Each report type has one or more available visualizations to plot data from one or more data types. 

## Data Types

Each available visualization is backed by a data type. A data type consists of a set of configuration for displaying domain-specific visualizations for observability data. Some example data types include apm, metrics, and logs.

For each respective data type, we fetch index pattern string from the app plugin contract, leveraging existing hasData API we have to return the index pattern string as well as a `hasData` boolean from each plugin.

In most cases, there will be a 1-1 relation between apps and data types.

### Observability `dataViews`

Once we have index pattern string for each data type, a respective `dataView` is created. If there is an existing dataView for an index pattern, we will fetch and reuse it.

After the dataView is created we also set field formats to promote human-readability. For example, we set format for monitor duration field, which is monitor.duration.us, from microseconds to seconds for browser monitors.

### Visualization Configuration

Each data type may have one or more visualization configurations. The data type to visualization configuration can be found in [`exploratory_view/obs_exploratory_view`](https://github.com/elastic/kibana/blob/main/x-pack/plugins/observability/public/components/shared/exploratory_view/obsv_exploratory_view.tsx#L86)

Each visualization configuration is mapped to a single report type.

Visualization configurations are used to define what the UI we display for each report type and data type combination in the series builder. 
Visualization configuration define UI options and display, including available `metrics`, available `filters`, available `breakdown` options, definitions for human-readable `labels`, and more.
The configuration also defines any custom base filters, which usually get pushed to a query, but are not displayed on the UI. You can also set more custom options on the configuration like colors which get used while rendering the chart.

Visualization configuration can be found at [`exploratory_view/configurations`](https://github.com/elastic/kibana/tree/main/x-pack/plugins/observability/public/components/shared/exploratory_view/configurations), where each data type typically has a folder that holds one or more visualization configurations. 

The configuration defined ultimately influences the lens embeddable attributes which get pushed to lens embeddable, rendering the chart.

Some options in configuration are:

#### Definition fields
They are also filters, but usually main filters, around which usually app UI is based.
For apm, it could be service name and for uptime, monitor name.

#### Filters
You can define base filters in kql form or data plugin filter format, filters are strongly typed.

#### Breakdown fields
List of fields from an index pattern, UI will use this to populate breakdown option select.

#### Labels
You can set key/value map for your field labels. UI will use these to set labels for data view fields.

Sample config
```
{
    reportType: ReportTypes.KPI,
    defaultSeriesType: 'bar_stacked',
    xAxisColumn: {
      sourceField: '@timestamp',
    },
    yAxisColumns: [
      {
        sourceField: REPORT_METRIC_FIELD,
        operationType: 'median',
      },
    ],
    hasOperationType: false,
    filterFields: ['observer.geo.name', 'monitor.type', 'tags'], // these fields get's resolved from relevant dataView
    breakdownFields: [
      'observer.geo.name',
      'monitor.type',
      'monitor.name',
      PERCENTILE,
    ], // these fields get's resolved from relevant dataView
    baseFilters: [],
    palette: { type: 'palette', name: 'status' },
    definitionFields: [
      { field: 'monitor.name', nested: SYNTHETICS_STEP_NAME, singleSelection: true },
      { field: 'url.full', filters: buildExistsFilter('summary.up', dataView) },
    ],
    metricOptions: [
      {
        label: MONITORS_DURATION_LABEL,
        field: 'monitor.duration.us',
        columnType: OPERATION_COLUMN,
      }
    ],
    labels: { ...FieldLabels, [SUMMARY_UP]: UP_LABEL, [SUMMARY_DOWN]: DOWN_LABEL },
  }
```



## Lens Embeddable

Lens embeddable is what actually renders the chart in exploratory view.

Exploratory view generates the lens embeddable attributes as json and pass it to the component.

Based on configuration, exploratory view generates layers and columns.

Add a link to lens embeddable readme

#### Example
A simple usage of lens embeddable example and playground options
[embedded_lens_example](../../../../../../examples/embedded_lens_example)

## Exploratory view Embeddable

The primary purpose of the exploratory view is to embed it in observability solutions like uptime to replace
existing static visualizations,

For that purpose, all the configuration options we define in the exploratory view can be used as an embeddable
via a component that is exposed using observability plugin contract,
usage looks like this

`const ExploratoryViewComponent = props.plugins.observability.ExploratoryViewEmbeddable;
`

```            
            <ExploratoryViewComponent
              attributes={[
                {
                  name: 'Monitors response duration',
                  time: {
                    from: 'now-5d',
                    to: 'now',
                  },
                  reportDefinitions: {
                    'monitor.id': ['test-id'],
                  },
                  breakdown: 'monitor.type',
                  operationType: 'average',
                  dataType: 'synthetics',
                  seriesType: 'line',
                  selectedMetricField: 'monitor.duration.us',
                },
              ]}
              reportType="kpi-over-time"
              title={'Monitor response duration'}
              withActions={['save', 'explore']}
            />
```

there is an example in kibana example which you can view using
`yarn start --run-examples` and view the code at [Exploratory view embeddable](../../../../../../examples/exploratory_view_example)

#### Example
A simple usage of lens embeddable example and playground options, run kibana with
`yarn start --run-example` to see this example in action
source code is defined at [embedded_lens_example](../../../../../../examples/embedded_lens_example)