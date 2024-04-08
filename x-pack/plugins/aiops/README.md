# aiops

The plugin provides APIs and components for AIOps features, including the “Log rate analysis” UI, maintained by the ML team.

---

## Log Rate Analysis

Here's some notes on the structure of the code for the API endpoint `/internal/aiops/log_rate_analysis`. The endpoint uses the `@kbn/ml-response-stream` package to return the request's response as a HTTP stream of JSON objects. The files are located in `x-pack/plugins/aiops/server/routes/log_rate_analysis/`.

`define_route.ts:defineRoute()` is the outer most wrapper that's used to define the route and its versions. It calls `route_handler_factory:routeHandlerFactory()` for each version.

The route handler sets up `response_stream_factory:responseStreamFactory()` to create the response stream and then walks through the steps of the analysis.

The response stream factory acts as a wrapper to set up the stream itself, the stream state (for example to set if it's running etc.), some custom actions on the stream as well as analysis handlers that fetch data from ES and pass it on to the stream.

### Analysis details

Here's some more details on the steps involved to do Log Rate Analysis:

- **Index info**: This gathers information from the selected index to identify which type of analysis will be run and which fields will be used for analysis.
  - **Zero Docs Fallback**: If there's no docs in either `baseline` or `baseline`, the analysis will not identify statistically significant items but will just run regular `terms` aggregations and return the top items for the deviation time range.
  - **Field identification**: This runs field caps with the `include_empty_fields=false` option to get populated fields. Custom Kibana code then identifies `keyword/ip/boolean` and `text/match_only/text` fields suitable for analysis. When there's field with both `keyword/text` mappings the `keyword` one will be preferred unless there's an override defined (currently `message` and `error.message`).
- **Statistically significant items**:
  - **General notes**: Both aggregatable fields and log pattern queries will be wrapped in `random_sampler` aggregations . The p-value threshold to define statistically significant items is `0.02`.
  - **Aggregatable fields**: For this we use the ES `significant_terms` aggregation with the p-value score option (https://www.elastic.co/guide/en/elasticsearch/reference/current/search-aggregations-bucket-significantterms-aggregation.html#p-value-score). The `baseline` time range is used as the `background_filter`, the `deviation` time range is used for the query part (=foreground).
  - **Log patterns**: To identify statistically significant entries in text fields there is not an ES equivalent to `significant_terms`, so we cannot run a single query for a field to do this. Instead, we use the following approach: We use the `categorize_text` aggregation to identify top text patterns across the baseline and deviation timerange (not yet statistically significant!). Then, for each identified text pattern, we get the document counts for both baseline and deviation. When then use the retrieved counts to run them against the same Kibana code we use for the Data Drift View to detect if there's a statistically significant difference in the counts (`@kbn/ml-chi2test` package, `x-pack/packages/ml/chi2test/critical_table_lookup.ts`). Text field pattern support was added in 8.11, see [#167467](https://github.com/elastic/kibana/issues/167467) for more details.
- **Grouping**: The grouping tries to identify co-occurences of identified significant items. Again, we have to take different approaches for aggregatable fields and log patterns, but eventually we combine the results. The `frequent_item_sets` aggregation is used as a first step to get co-occurence stats of aggregatable fields. This can be a heavy aggregation so we limit how much values per field we pass on to the agg (`50` at the moment). For each possible aggregatable field to log pattern relation we query the doc count. The result of the `frequent_item_sets` aggregation and those doc counts get then passed on to custom code (derived but over time slighty improved from the original PoC Python Notebooks) to transform that raw data into groups (`x-pack/packages/ml/aiops_log_rate_analysis/queries/get_significant_item_groups.ts`).
- **Histogram data**: In addition to the analysis itself the endpoint returns histogram data for the result table sparklines.
