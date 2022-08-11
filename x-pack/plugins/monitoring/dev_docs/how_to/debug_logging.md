When diagnosing issues with UI or alert errors, it can be useful to know the exact query being sent by kibana to elasticsearch.

Rules should have a `fetchData` setup [like this one](/x-pack/plugins/monitoring/server/alerts/nodes_changed_rule.ts#L96). Tracing down will get you to `fetchNodesFromClusterStats`.

Just before the `esClient.search` call you can log out the query parameters using something like:

```typescript
console.log(JSON.stringify(params));
```

With kibana running locally (possibly connected to a [cloud test cluster](../how_to/cloud_setup.md)), enable the rule and let it run.

Visit the UI for the first time or use the "manage" link in the top right to create the rules. Once created they should be visible in the "Rules and Connectors" section of stack management.

Once the rule runs you should see output like this:

```json
{
  "index": ".monitoring-es-6-*,.monitoring-es-7-*,metricbeat-disabled-*",
  "filter_path": ["aggregations.clusters.buckets"],
  "body": {
    "size": 0,
    "sort": [{ "timestamp": { "order": "desc", "unmapped_type": "long" } }],
    "query": {
      "bool": {
        "filter": [
          { "term": { "type": "cluster_stats" } },
          { "range": { "timestamp": { "gte": "now-2m" } } }
        ]
      }
    },
    "aggs": {
      "clusters": {
        "terms": { "include": ["XoDBYCe_QLCYIfyc_wPtrw"], "field": "cluster_uuid" },
        "aggs": {
          "top": {
            "top_hits": {
              "sort": [{ "timestamp": { "order": "desc", "unmapped_type": "long" } }],
              "_source": { "includes": ["cluster_state.nodes_hash", "cluster_state.nodes"] },
              "size": 2
            }
          }
        }
      }
    }
  }
}
```

Note that this isn't a valid Elasticsearch query on its own, you'll need to extract the body and index pattern into something like this.

```
GET {{.index}}/_search?filter_path={{.filter_path}}
{{.body}}
```

You can likely omit the `filter_path` from the query since it's mainly a performance optimization.

This technique can be used similarly in server API routes.

In stack releases since 7.15 ([kibana#107711](https://github.com/elastic/kibana/pull/107711)), you can set `monitoring.ui.debug_mode: true` to get similar output without making any code changes.
