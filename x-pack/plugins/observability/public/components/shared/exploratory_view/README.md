# Exploratory view component

This component is used in observability plugin to show lens embeddable based observability visualizations. 
The view is populated using configs stored as json within the view for each data type.

This readme file contains few of the concepts being used in the component.

## Report Type

The exploratory view report type controls how the data is visualized in the lens embeddable. The report type defines a set of constraits over the x and y axis. For example, the `kpi-over-time` report type is a time series chart type that plots key performance indicators over time, while the `data-distrubtion` chart plots the percentage of documents over key performance indicators. Current available data types can be found at `exploratory_view/configurations/constants`.

Each report type has one or more available visualizations to plot data from one or more data types. 

## Data Types

Each available visualization is backed by a data type. A data type consists of a set of configuration for displaying domain-specific visualizations for observability data. Some example data types include apm, metrics, and logs.

For each respective data type, we fetch index pattern string from the app plugin contract, leveraging existing hasData API we have to return the index pattern string as well as a `hasData` boolean from each plugin.

In most cases, there will be a 1-1 relation between apps and data types.

### Observability `dataViews`

Once we have index pattern string for each data type, a respective `dataView` is created. If there is an existing dataView for an index pattern, we will fetch and reuse it.

After the dataView is created we also set field formats to promote human-readibility. For example, we set format for monitor duration field, which is monitor.duration.us, from microseconds to seconds for browser monitors.

### Visualization Configuration

Each data type may have one or more visualization configuration. The data type to visualization configuration can be found in [`exploratory_view/obs_exploratory_view`](https://github.com/elastic/kibana/blob/main/x-pack/plugins/observability/public/components/shared/exploratory_view/obsv_exploratory_view.tsx#L86)

Each visualizaiton configuration is mapped to a single report type.

Visualization configurations are used to define what the UI we display for each report type and data type combination in the series builder. Visualization configuration define UI options and display, including available metrics, available filters, available breakdown options, definitons for human-readable labels, and more. The configuration also defines any custom base filters, which usually get pushed to a query, but are not displayed on the UI. You can also set more custom options on the configuration like colors which get used while rendering the chart.

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

## Lens Embeddable

Lens embeddable is what actually renders the chart in exploratory view.

Exploratory view generates the lens embeddable attributes as json and pass it to the component.

Based on configuration, exploratory view generates layers and columns.

Add a link to lens embeddable readme

