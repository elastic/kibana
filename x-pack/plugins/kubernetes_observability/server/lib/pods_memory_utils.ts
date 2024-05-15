import { estypes } from '@elastic/elasticsearch';
import { round, PodMem, Limits, } from './utils';
import { ElasticsearchClient } from '@kbn/core/server';

// Define the global CPU limits to categorise memory utilisation
const limits: Limits = {
    medium: 0.7,
    high: 0.9,
};

// Define the global Deviation limit to categorise memory memory_usage_median_absolute_deviation
const deviation = 5e+7 // We define that deviations more than 50Megabytes should be looked by the user

export function defineQueryForAllPodsMemoryUtilisation(podName: string, namespace: string, client: ElasticsearchClient) {
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
        { exists: { field: 'metrics.k8s.pod.memory.usage' } }
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
            'metrics.k8s.pod.memory.*',
            'resource.attributes.k8s.*',
        ],
        query: {
            bool: {
                must: mustsPodsCpu,
                filter: filter,
            },
        },
        aggs: {
            memory_usage: { stats: { field: 'metrics.k8s.pod.memory.usage' } },
            memory_usage_variability: {
                median_absolute_deviation: {
                    field: 'metrics.k8s.pod.memory.usage'
                }
            },
            memory_available: { stats: { field: 'metrics.k8s.pod.memory.available' } },
            memory_available_variability: {
                median_absolute_deviation: {
                    field: 'metrics.k8s.pod.memory.available'
                }
            }
        },
    };
    return dslPodsCpu;
}


export function calulcatePodsMemoryUtilisation(podName: string, namespace: string, esResponsePods: estypes.SearchResponse<unknown, Record<string, estypes.AggregationsAggregate>>) {
    var message = undefined;
    var reasons = undefined;
    var alarm = '';
    var memory_utilization = undefined;
    var pod = {} as PodMem;

    //console.log("esResponsePods:"+ esResponsePods.aggregations?.memory_usage);

    if (Object.keys(esResponsePods.aggregations).length > 0) {
        const hitsall = esResponsePods.aggregations;
        //console.log(hitsall);

        var memory_usage_median_absolute_deviation = hitsall?.memory_usage_variability.value;
        const memory_usage_min = hitsall?.memory_usage.min;
        const memory_usage_max = hitsall?.memory_usage.max;
        const memory_usage_avg = hitsall?.memory_usage.avg;
        const memory_available_count = hitsall?.memory_available.count;
        const memory_available_avg = hitsall?.memory_available.avg;

        pod = {
            'name': podName,
            'namespace': namespace,
            'memory_available': {
                'avg': memory_available_avg,
            },
            'memory_usage': {
                'min': memory_usage_min,
                'max': memory_usage_max,
                'avg': memory_usage_avg,
                'median_absolute_deviation': memory_usage_median_absolute_deviation,
            },
        };

        var deviation_alarm = "Low"
        if (memory_usage_median_absolute_deviation >= deviation) {
            var deviation_alarm = "High"
        }

        if (memory_available_count == 0) {
            reasons = {
                'pod': podName, reason: [
                    { 'value': undefined, 'desc': ' Metric memory_available value is not defined ' },
                    { 'value': deviation_alarm, 'desc': ' Memory usage median absolute deviation ' }],
            };
            message = { 'pod': podName, 'memory_usage': pod.memory_usage, 'memory_usage_median_absolute_deviation': pod.memory_usage.median_absolute_deviation, 'desc': ' Pod Memory usage in  Bytes' };
        } else {
            memory_utilization = round(memory_usage_avg / (memory_available_avg + memory_usage_avg), 3);

            if (memory_utilization < limits.medium) {
                alarm = "Low";
            } else if (memory_utilization >= limits.medium && memory_utilization < limits.high) {
                alarm = "Medium";
            } else {
                alarm = "High";
            }
            reasons = {
                'pod': podName, reason: [
                    { 'memory': alarm,  },
                    { 'memory_usage_median_absolute_deviation': deviation_alarm }]
            };

        }
    }
    return [reasons, pod];
}
