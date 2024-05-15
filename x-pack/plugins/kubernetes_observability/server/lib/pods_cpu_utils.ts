import { estypes } from '@elastic/elasticsearch';
import { Limits, PodCpu } from './utils';
import { ElasticsearchClient } from '@kbn/core/server';

// Define the global CPU limits to categorise cpu utilisation
const limits: Limits = {
    medium: 0.7,
    high: 0.9,
};

// Define the global Deviation limit to categorise cpu_utlization_median_absolute_deviation
const deviation = 0.3 // We define that deviations more than 30% should be looked by the user


export function defineQueryForAllPodsCpuUtilisation(podName: string, namespace: string, client: ElasticsearchClient) {
    const mustsPodsCpu = [
        {
            term: {
                'resource.attributes.k8s.pod.name': podName,
            },
        },
        {
            term: {
                'resource.attributes.k8s.namespace.name': namespace,
            },
        },
        { exists: { field: 'metrics.k8s.pod.cpu.utilization' } }
    ];
    const filter = [
        {
            range: {
                "@timestamp": {
                    "gte": "now-5m"
                }
            }
        }
    ]
    const dslPodsCpu: estypes.SearchRequest = {
        index: ["metrics-otel.*"],
        sort: [{ '@timestamp': 'desc' }],
        _source: false,
        fields: [
            '@timestamp',
            'metrics.k8s.pod.cpu.utilization',
            'resource.attributes.k8s.*',
        ],
        query: {
            bool: {
                must: mustsPodsCpu,
                filter: filter,
            },
        },
        aggs: {
            cpu_utilization: { stats: { field: 'metrics.k8s.pod.cpu.utilization' } },
            review_variability_cpu_utilization: {
                median_absolute_deviation: {
                    field: 'metrics.k8s.pod.cpu.utilization'
                }
            }
        },
    };
    return dslPodsCpu;
}


export function calulcatePodsCpuUtilisation(podName: string, namespace: string, esResponsePods: estypes.SearchResponse<unknown, Record<string, estypes.AggregationsAggregate>>) {
    var reason = {};
    var alarm = '';
    var pod = {} as PodCpu;

    if (Object.keys(esResponsePods.aggregations).length > 0) {
        const hitsall = esResponsePods.aggregations;
        //
        const cpu_utilization_median_absolute_deviation = hitsall?.review_variability_cpu_utilization.value;
        const cpu_utilization_min = hitsall?.cpu_utilization.min;
        const cpu_utilization_max = hitsall?.cpu_utilization.min;
        const cpu_utilization_avg = hitsall?.cpu_utilization.avg;

        pod = {
            'name': podName,
            'namespace': namespace,
            'cpu_utilization': {
                'min': cpu_utilization_min,
                'max': cpu_utilization_max,
                'avg': cpu_utilization_avg,
                'median_absolute_deviation': cpu_utilization_median_absolute_deviation
            }
        };

        var deviation_alarm = "Low"
        if (cpu_utilization_median_absolute_deviation >= deviation) {
            var deviation_alarm = "High"
        }

        if (cpu_utilization_avg < limits.medium) {
            alarm = "Low";
        } else if (cpu_utilization_avg >= limits.medium && cpu_utilization_avg < limits.high) {
            alarm = "Medium";
        } else {
            alarm = "High";
        }
        reason = {
            'pod': podName, reason: {
                'cpu utilisation': alarm,
                'cpu_utilisation_median_absolute_deviation': deviation_alarm
            }
        };
    }

    return [reason, pod];
}

