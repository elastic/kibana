TODO: combine with data_streams.md

This document is part of the original drafts for ingest management documentation in `docs/ingest_manager` and may be outdated.
Overall documentation of Ingest Management is now maintained in the `elastic/stack-docs` repository.

# Indexing Strategy

Ingest Management enforces an indexing strategy to allow the system to automatically detect indices and run queries on it. In short the indexing strategy looks as following:

```
{data_stream.type}-{data_stream.dataset}-{data_stream.namespace}
```

The `{data_stream.type}` can be `logs` or `metrics`. The `{data_stream.namespace}` is the part where the user can use free form. The only two requirement are that it has only characters allowed in an Elasticsearch index name and does NOT contain a `-`. The `data_stream` is defined by the data that is indexed. The same requirements as for the namespace apply. It is expected that the fields for type, dataset, and namespace are part of each event and are constant keywords. If there is a dataset or a namespace with a `-` inside, it is recommended to replace it either by a `.` or a `_`.

Note: More `{data_stream.type}`s might be added in the future like `traces`.

This indexing strategy has a few advantages:

- Each index contains only the fields which are relevant for the datta stream. This leads to more dense indices and better field completion.
- ILM policies can be applied per namespace per data stream.
- Rollups can be specified per namespace per data stream.
- Having the namespace user configurable makes setting security permissions possible.
- Having a global metrics and logs template, allows to create new indices on demand which still follow the convention. This is common in the case of k8s as an example.
- Constant keywords allow to narrow down the indices we need to access for querying very efficiently. This is especially relevant in environments which a large number of indices or with indices on slower nodes.

Overall it creates smaller indices in size, makes querying more efficient and allows users to define their own naming parts in namespace and still benefiting from all features that can be built on top of the indexing startegy.

## Ingest Pipeline

The ingest pipelines for a specific data stream will have the following naming scheme:

```
{data_stream.type}-{data_stream.dataset}-{package.version}
```

As an example, the ingest pipeline for the Nginx access logs is called `logs-nginx.access-3.4.1`. The same ingest pipeline is used for all namespaces. It is possible that a data stream has multiple ingest pipelines in which case a suffix is added to the name.

The version is included in each pipeline to allow upgrades. The pipeline itself is listed in the index template and is automatically applied at ingest time.

## Templates & ILM Policies

To make the above strategy possible, alias templates are required. For each type there is a basic alias template with a default ILM policy. These default templates apply to all indices which follow the indexing strategy and do not have a more specific data stream alias template.

The `metrics` and `logs` alias template contain all the basic fields from ECS.

Each type template contains an ILM policy. Modifying this default ILM policy will affect all data covered by the default templates.

The templates for a data stream are called as following:

```
{data_stream.type}-{data_stream.dataset}
```

The pattern used inside the index template is `{type}-{dataset}-*` to match all namespaces.

## Defaults

If the Elastic Agent is used to ingest data and only the type is specified, `default` for the namespace is used and `generic` for the dataset.

## Data filtering

Filtering for data in queries for example in visualizations or dashboards should always be done on the constant keyword fields. Visualizations needing data for the nginx.access dataset should query on `type:logs AND dataset:nginx.access`. As these are constant keywords the prefiltering is very efficient.

## Security permissions

Security permissions can be set on different levels. To set special permissions for the access on the prod namespace, use the following index pattern:

```
/(logs|metrics)-[^-]+-prod-$/
```

To set specific permissions on the logs index, the following can be used:

```
/^(logs|metrics)-.*/
```

Todo: The above queries need to be tested.
