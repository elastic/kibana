import { estypes } from '@elastic/elasticsearch';
import { round, Pod, Limits } from './utils';
import { ElasticsearchClient } from '@kbn/core/server';

// Define the global CPU limits to categorise memory utilisation
const limits: Limits = {
    medium: 0.003,
    high: 0.9,
};

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

// export function calulcateAllPodsMemoryUtilisation(podName: string, namespace: string, esResponsePodsCpu: estypes.SearchResponse<unknown, Record<string, estypes.AggregationsAggregate>>) {
//     var message = undefined;
//     var reason = undefined;
//     var alarm = '';
//     var memory_available = undefined;
//     var memory_usage = undefined;
//     var memory_utilization = undefined;
//     var memory_usage_median = undefined;
//     var pods = new Array();
//     var memories_usage = new Array();
//     var memories_available = new Array();
//     if (esResponsePodsCpu.hits.hits.length > 0) {
//         const hitsall = esResponsePodsCpu.hits.hits;
//         //console.log(hitpodcpu);

//         for (const [_, hit] of toEntries(hitsall)) {
//             console.log(hit);
//             var pod = {} as Pod;
//             const { fields = {} } = hit;
//             const name = extractFieldValue(fields['resource.attributes.k8s.pod.name']);
//             const namespace = extractFieldValue(fields['resource.attributes.k8s.namespace.name']);
//             const memory_available = extractFieldValue(fields['metrics.k8s.pod.memory.available']);
//             const memory_usage = extractFieldValue(fields['metrics.k8s.pod.memory.usage']);

//             pod = {
//                 'name': name,
//                 'namespace': namespace,
//                 'memory_usage': memory_usage,
//                 'memory_usage_min': undefined,
//                 'memory_usage_max': undefined,
//                 'cpu_utilization': undefined
//             };
//             pods.push(pod);
//         }

//         for (var pod1 of pods) {
//             console.log("Name: " + pod1.name, "Available: " + pod1.memory_available + ", Usage: " + pod1.memory_usage);
//             memories_usage.push(pod1.memory_usage);
//             memories_available.push(pod1.memory_available);
//         }
//         const total_memory_usage = memories_usage.reduce((accumulator, currentValue) => accumulator + currentValue);
//         memory_usage = total_memory_usage / pods.length;
//         memory_usage_median = median(memories_usage);
//         const total_memory_available = memories_available.reduce((accumulator, currentValue) => accumulator + currentValue);

//         if (isNaN(total_memory_available)) {
//             reason = { 'pod': podName, 'value': undefined, 'desc': ' No memory limit defined ' };
//             message = { 'pod': podName, 'memory_usage': memory_usage, 'memory_usage_median': memory_usage_median, 'desc': ' Pod Memory usage in  Bytes' };
//         } else {
//             memory_available = total_memory_available / pods.length;
//             memory_utilization = round(memory_usage / memory_available, 3);

//             if (memory_utilization < limits["medium"]) {
//                 alarm = "Low";
//             } else if (memory_utilization >= limits["medium"] && memory_utilization < limits["high"]) {
//                 alarm = "Medium";
//             } else {
//                 alarm = "High";
//             }
//             reason = { 'pod': podName, 'value': alarm, 'desc': ' Memory utilisation' };
//             message = { 'pod': podName, 'memory_available': memory_available, 'memory_usage': memory_usage, 'memory_utilisation': memory_utilization, 'memory_usage_median': memory_usage_median, 'Desc': '% - Percentage of Memory utilisation' };

//         }
//     }
//     return [reason, message, memory_usage, memory_usage_median, memory_available, memory_utilization];
// }


export function calulcatePodsMemoryUtilisation(podName: string, namespace: string, esResponsePods: estypes.SearchResponse<unknown, Record<string, estypes.AggregationsAggregate>>) {
    var message = undefined;
    var reason = undefined;
    var alarm = '';
    var memory_available = undefined;
    var memory_usage = undefined;
    var memory_utilization = undefined;
    //console.log("esResponsePods:"+ esResponsePods.aggregations?.memory_usage);

    if (Object.keys(esResponsePods.aggregations).length > 0) {
        const hitsall = esResponsePods.aggregations;
        //console.log(hitsall);
        var pod = {} as Pod;

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
             'avg':   memory_available_avg,
            },
            'memory_usage': {
             'min' :   memory_usage_min,
             'max' :   memory_usage_max,
             'avg' :   memory_usage_avg,
             'median_absolute_deviation': memory_usage_median_absolute_deviation, 
            },
            'cpu_utilization': undefined
        };

        if (memory_available_count == 0) {
            reason = { 'pod': podName, 'value': undefined, 'desc': ' No memory limit defined ' };
            message = { 'pod': podName, 'memory_usage': pod.memory_usage, 'memory_usage_median_absolute_deviation': pod.memory_usage.median_absolute_deviation, 'desc': ' Pod Memory usage in  Bytes' };
        } else {
            memory_utilization = round(memory_usage_avg /( memory_available_avg + memory_usage_avg), 3);

            if (memory_utilization < limits.medium) {
                alarm = "Low";
            } else if (memory_utilization >= limits.medium && memory_utilization < limits.high) {
                alarm = "Medium";
            } else {
                alarm = "High";
            }
            reason = { 'pod': podName, 'value': alarm, 'desc': ' Memory utilisation' };
            message = { 'pod': podName, 'memory_available': pod.memory_available, 'memory_usage': memory_usage, 'memory_utilisation': memory_utilization, 'memory_usage_median_absolute_deviation': pod.memory_usage.median_absolute_deviation, 'Desc': '% - Percentage of Memory utilisation' };

        }
    }
    return [reason, message, memory_usage, memory_usage_median_absolute_deviation , memory_available, memory_utilization];
}
