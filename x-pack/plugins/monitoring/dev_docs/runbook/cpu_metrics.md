CPU Utilization is a metric that seems like a simple question: How hard are my CPUs working?

But the way CPU resources get managed can get interesting. Especially when [cgroups](https://www.kernel.org/doc/Documentation/cgroup-v1/cgroups.txt) and [CFS](https://www.kernel.org/doc/html/latest/scheduler/sched-design-CFS.html) are used.

When trying to debug why a CPU metric doesn't look the way you expect it to in a Stack Monitoring graph, this information may be helpful.

At the time of writing, the code path to get from a system level CPU metric to a utilization percentage looks like this:

1. `node_cpu_metric` set to `node_cgroup_quota_as_cpu_utilization` when cgroup is enabled: [node_detail.js](/x-pack/plugins/monitoring/server/routes/api/v1/elasticsearch/node_detail.js#L61-65)
1. `node_cgroup_quota_as_cpu_utilization` defined as a `QuotaMetric` against `cpu.cfs_quota_micros`: [metrics.ts](/x-pack/plugins/monitoring/server/lib/metrics/elasticsearch/metrics.ts#L798-801)
1. `QuotaMetric` tries to produce a ratio of usage to quota, but returns null when quota isn't a positive number: [quota_metric.ts](/x-pack/plugins/monitoring/server/lib/metrics/classes/quota_metric.ts#L79-80)

So it's important to be aware of the `monitoring.ui.container.elasticsearch.enabled` setting, which defaults to `true` on cloud.elastic.co.

Some values of `cfs_quota_micros` could produce unexpected results. For example, if cgroups enabled but no quota is set, you'll get an "N/A" in the stack monitoring UI since elasticsearch can't directly see how much of the CPU it's using.

You can confirm a point-in-time value of `cfs_quota_micros` for Elasticsearch by using the [node stats API](https://www.elastic.co/guide/en/elasticsearch/reference/master/cluster-nodes-stats.html).

The CPU available on Elastic Cloud is based on the memory size of the instance, and smaller instance sizes get an additional boost via direct adjustments to the `cfs_quota_us` cgroup setting.

For self-hosted deployments, the cgroup configuration will likely need to be checked via `docker inspect`.
