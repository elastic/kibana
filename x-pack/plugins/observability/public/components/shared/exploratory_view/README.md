# Exploratory view component

This component is used in observability plugin to show lens embeddable based observability visualizations. 
The view is populated using configs stored as json within the view for each data type.

This readme file contains few of the concepts being used in the component.
## Data Types

Right now data types essentially refers to four kinds of apps we have, synthetics(uptime), apm, metrics, logs. 
Essentially we are trying to create 1-1 relation between apps and data types we have.

For each respective data type, we fetch index pattern string from the app plugin contract.

We leverage existing hasData API we have, we return index pattern string also hasData boolean from each plugin.

## Observability dataViews

Once we have index pattern string for each data type , we create a respective dataView. We try to make sure, if there is an existing dataView for an index pattern string, we fetch , that and reuse it.
After the dataView is created we also set field formats for some fields. For example, we set format for monitor duration field, which is monitor.duration.us, from microseconds to seconds for browser monitors.

So that when visualization is created value is human-readable.

## Report types
Report types are actually what we want to draw on the chart, is it kpi over time chart or is it a simple distribution.
Based on configurations we have , we show the user report type select and once the report type is selected, we create relevant chart from lens library.

This usually also reflects field we will have on x or y axises of the chart. KPI over time usually means
@timestamp will be reflected on x-axis.

## Report configurations
Configuration are used to define what UI we want to display for each report type and data type in the series builder below chart in exploratory view.
Based on configuration we also generate lens embeddable attributes which get pushed to lens embeddable, which renders the chart.

Configuration includes UI filters it needs to display, breakdown select options and if it has any custom base filters, which usually get pushed to query,
but may not be displayed on the UI. 

You can also set more custom options on the configuration like colors which get used while rendering the chart.

## report definition vs filters


## Lens Embeddable

Lens embeddable is what actually renders the chart in exploratory view.

Exploratory view generates the lens embeddable attributes as json and pass it to the component.

Based on configuration, exploratory view generates layers and columns.


