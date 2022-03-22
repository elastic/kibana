# Infrastructure Node Metrics Tables

This folder contains components that are used to display metrics about infrastructure components.
Currently there are tables for containers, pods and hosts.

For use within the Infra plugin, make use of the `useXMetricsTable` hooks and their matching 
`XMetricsTable` components.

For use outside of the Infra plugin, consume these components via the lazy components exposed on the
start contract of the plugin.

## The shared data hook

All tables get their data from the Metrics Explorer API by making use of the 
`useInfrastructureNodeMetrics` hook. The key input to the hook is the `MetricsMap` which defines
which metrics should be requested (by field and type of aggregation). By passing a `MetricsMap` to 
the helper `metricsToApiOptions` we get back the options we need to pass to 
`useInfrastructureNodeMetrics`. `metricsToApiOptions` also returns a mapping object that is used to 
translate the field name to the format the API returns (e.g. `metric_0`).
The `MetricsMap` type is mostly to ensure that the object key and the `field` value match to avoid
mistakes when re-ordering the metrics being used.

`useInfrastructureNodeMetrics` also expects a timerange and a filter (in ES DSL) and a function
to transform the Metrics Explorer response to something more suitable for the table component to
work with.

Internally, the hook manages loading the source, making the API request, sorting and paginating the
response. It also manages the loading state.

Currently, it does a large request and then does sorting and pagination on the client. In the future
we should replace this with a terms aggregation in the API instead, to do more work in 
Elasticsearch.

## Hooks and tables per node type

For each node type there is a stateless table and a hook to load the data in the right format for
the table.

Within the hook file we find the `MetricsMap` definition for each node type and the transformation
function. The transformation function makes use of the `metricByField` to unpack the API response
in a type safe way.
The body of the hook sets up the page and sort state, then invokes the shared data hook.

The table itself is a fairly simple component that uses EUI components to render a table with 
pagination. It makes use of components found in the shared folder for the things that are common
across each node type such as the pagination and Node Details page link.

When using the hook it is important to wrap the timerange and filter clause DSL parameters in 
something like `useMemo` to avoid a re-rendering loop.

## The embeddable component factories

To make it as easy as possible to consume these tables we expose them fully integrated on our start
contract. The component that is exposed lazily loads our component, adds in all of our providers
and calls the node type specific hook and passes the result to the node type specific table 
component. Integration should be as simple as dropping in the component in a React hierarchy.

The `createLazyXMetricsTable` factory function accepts our Kibana dependencies and return a new
component that lazily renders our integrated component, capturing our dependencies in a closure
during plugin start.

The integrated component passes these dependencies to the providers the table needs in context as
well as any props that were passed to the lazy component (such as the time range and filter).
If needed, the lazy component can also accept a property called `sourceId` to modify which Infra
source configuration is used, the default is `default`.
Finally the component calls the node specific hook and renders the node specific table.
