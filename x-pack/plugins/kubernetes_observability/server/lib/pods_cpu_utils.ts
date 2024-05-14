import { estypes } from '@elastic/elasticsearch';
import { extractFieldValue, toEntries, round, Pod, Limits, median } from './utils';
import { ElasticsearchClient } from '@kbn/core/server';

// Define the global CPU limits to categorise cpu utilisation
const limits: Limits = {
    medium: 0.7,
    high: 0.9,
};

// Define the global Deviation limit to categorise cpu_utlization_median_absolute_deviation
const deviation = 0.30 // We define that deviations more than 30% should be looked by the user


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
    var message = {};
    var reason = {};
    var alarm = '';
    var cpu_utilization = undefined;

    if (Object.keys(esResponsePods.aggregations).length > 0) {
        const hitsall = esResponsePods.aggregations;
        //console.log(hitpodcpu);


        var pod = {} as Pod;
        var cpu_utilization_median_absolute_deviation = hitsall?.review_variability_cpu_utilization.value;
        let cpu_utilization_min = hitsall?.cpu_utilization.min;
        let cpu_utilization_max = hitsall?.cpu_utilization.min;
        let cpu_utilization_avg = hitsall?.cpu_utilization.avg;

        pod = {
            'name': podName,
            'namespace': namespace,
            'memory_available': {
                'avg': undefined,
            },
            'memory_usage': {
                'min': undefined,
                'max': undefined,
                'avg': undefined,
                'median_absolute_deviation': undefined,
            },
            'cpu_utilization': {
                'min': cpu_utilization_min,
                'max': cpu_utilization_max,
                'avg': cpu_utilization_avg,
                'median_absolute_deviation': cpu_utilization_median_absolute_deviation
            }
        };
       

        if (cpu_utilization_avg < limits.medium) {
            alarm = "Low";
        } else if (cpu_utilization_avg >= limits.medium && cpu_utilization_avg < limits.high) {
            alarm = "Medium";
        } else {
            alarm = "High";
        }
        reason = { 'pod': podName, 'value': alarm, 'desc': ' Cpu utilisation' };
        message = { 'pod': podName, 'cpu_utilization': pod.cpu_utilization,  'Desc': '% - Percentage of Cpu utilisation' };
    }

    return [reason, message, cpu_utilization, cpu_utilization_median_absolute_deviation];
}
