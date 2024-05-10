import { estypes } from '@elastic/elasticsearch';
import { extractFieldValue, toEntries, round, Pod, median } from './utils';
import { double } from '@elastic/elasticsearch/lib/api/types';
import { ElasticsearchClient } from '@kbn/core/server';

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
    };
    return dslPodsCpu;
}

export function defineQueryForPodsMemoryUtilisation(podName: string, namespace: string, client: ElasticsearchClient) {
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

    const dslPodsCpu: estypes.SearchRequest = {
        index: ["metrics-otel.*"],
        size: 1,
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
            },
        },
    };
    return dslPodsCpu;
}


export function calulcatePodsMemoryUtilisation(podName: string, namespace: string, esResponsePodsCpu: estypes.SearchResponse<unknown, Record<string, estypes.AggregationsAggregate>>) {
    var message = {};
    var reason = {};
    var alarm = '';
    var memory_available = undefined;
    var memory_usage = undefined;
    var memory_utilization = undefined;

    if (esResponsePodsCpu.hits.hits.length > 0) {
        const hitpodcpu = esResponsePodsCpu.hits.hits[0];
        const { fields = {} } = hitpodcpu;
        //console.log(hitpodcpu);

        memory_available = extractFieldValue(fields['metrics.k8s.pod.memory.available']);
        memory_usage = extractFieldValue(fields['metrics.k8s.pod.memory.usage']);
        if (memory_available != null) {
            memory_utilization = round(memory_usage / memory_available, 3);

            type Limits = {
                [key: string]: double;
            };
            const limits: Limits = {
                medium: 0.7,
                high: 0.9,
            };
            if (memory_utilization < limits["medium"]) {
                alarm = "Low"
            } else if (memory_utilization >= limits["medium"] && memory_utilization < limits["high"]) {
                alarm = "Medium"
            } else {
                alarm = "High"
            }
            reason = { 'Pod': podName, 'Reason': alarm, 'Desc': ' Memory utilisation' };
            message = { 'Pod': podName, 'memory_available': memory_available, 'memory_usage': memory_usage, 'memory_utilisation': memory_utilization, 'Desc': '% - Percentage of Memory utilisation' };
        } else {
            reason = { 'Pod': podName, 'Reason': undefined, 'Desc': ' No memory limit defined ' };
            message = { 'Pod': podName, 'memory_usage': memory_usage, 'Desc': ' Pod Memory usage in  Bytes' };
        }
    }
    return [reason, message, memory_available, memory_usage, memory_utilization]
}

export function calulcateAllPodsMemoryUtilisation(podName: string, namespace: string, esResponsePodsCpu: estypes.SearchResponse<unknown, Record<string, estypes.AggregationsAggregate>>) {
    var message = {};
    var reason = {};
    var alarm = '';
    var memory_available = undefined;
    var memory_usage = undefined;
    var memory_utilization = undefined;
    var memory_usage_median = undefined;
    var pods = new Array();
    var memories_usage = new Array();
    var memories_available = new Array();
    if (esResponsePodsCpu.hits.hits.length > 0) {
        const hitsall = esResponsePodsCpu.hits.hits;
        //console.log(hitpodcpu);

        for (const [_, hit] of toEntries(hitsall)) {
            //console.log(hit);
            var pod = {} as Pod;
            const { fields = {} } = hit;
            const name = extractFieldValue(fields['resource.attributes.k8s.pod.name']);
            const namespace = extractFieldValue(fields['resource.attributes.k8s.namespace.name']);
            const memory_availabe = extractFieldValue(fields['metrics.k8s.pod.memory.available']);
            const memory_usage = extractFieldValue(fields['metrics.k8s.pod.memory.usage']);

            pod = {
                'name': name,
                'namespace': namespace,
                'memory_availabe': memory_availabe,
                'memory_usage': memory_usage,

            };
            pods.push(pod);
        }
        
        for (var pod1 of pods) {
            //console.log("Name: " + pod1.name, "Available: " + pod1.memory_availabe + ", Usage: " + pod1.memory_usage);
            memories_usage.push(pod1.memory_usage);
            memories_available.push(pod1.memory_availabe);
        }
        const total_memory_usage = memories_usage.reduce((accumulator, currentValue) => accumulator + currentValue);
        const total_memory_available = memories_available.reduce((accumulator, currentValue) => accumulator + currentValue);

        // console.log("Sum" + total_memory_usage)
        // console.log("Average" + total_memory_usage / pods.length)
        // console.log("Median" + median(memories_usage))

        memory_usage = total_memory_usage / pods.length
        memory_usage_median = median(memories_usage)
        memory_available = total_memory_available / pods.length
        if (memory_available != null) {
            memory_utilization = round(memory_usage / memory_available, 3);

            type Limits = {
                [key: string]: double;
            };
            const limits: Limits = {
                medium: 0.7,
                high: 0.9,
            };
            if (memory_utilization < limits["medium"]) {
                alarm = "Low"
            } else if (memory_utilization >= limits["medium"] && memory_utilization < limits["high"]) {
                alarm = "Medium"
            } else {
                alarm = "High"
            }
            reason = { 'Pod': podName, 'Reason': alarm, 'Desc': ' Memory utilisation' };
            message = { 'Pod': podName, 'memory_available': memory_available, 'memory_usage': memory_usage, 'memory_utilisation': memory_utilization, 'memory_usage_median': memory_usage_median, 'Desc': '% - Percentage of Memory utilisation' };
        } else {
            reason = { 'Pod': podName, 'Reason': undefined, 'Desc': ' No memory limit defined ' };
            message = { 'Pod': podName, 'memory_usage': memory_usage, 'memory_usage_median': memory_usage_median, 'Desc': ' Pod Memory usage in  Bytes' };
        }
    }
    return [reason, message, memory_available, memory_usage, memory_utilization, memory_usage_median]
}
