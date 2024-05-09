import { estypes } from '@elastic/elasticsearch';
import { extractFieldValue, round } from './utils';
import { double } from '@elastic/elasticsearch/lib/api/types';
import { ElasticsearchClient } from '@kbn/core/server';

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
    var memory_available= undefined;
    var memory_usage= undefined;
    var memory_utilization = undefined;

    if (esResponsePodsCpu.hits.hits.length > 0) {
        const hitpodcpu = esResponsePodsCpu.hits.hits[0];
        const { fields = {} } = hitpodcpu;
        console.log(hitpodcpu);

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
            message = { 'Pod': podName, 'memory_available': memory_available , 'memory_usage': memory_usage, 'memory_utilisation': memory_utilization, 'Desc': '% - Percentage of Memory utilisation' };
        } else {
            reason = { 'Pod': podName, 'Reason': undefined, 'Desc': ' No memory limit defined ' };
            message = { 'Pod': podName, 'memory_usage': memory_usage , 'Desc': ' Pod Memory usage in  Bytes' };
        }
    }
    return [reason, message, memory_available, memory_usage, memory_utilization]
}