import { estypes } from '@elastic/elasticsearch';
import { extractFieldValue, toEntries, round, Pod, Limits, median } from './utils';
import { ElasticsearchClient } from '@kbn/core/server';

// Define the global CPU limits to categorise cpu utilisation
const limits: Limits = {
    medium: 0.7,
    high: 0.9,
};

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
    };
    return dslPodsCpu;
}


export function calulcateAllPodsCpuUtilisation(podName: string, namespace: string, esResponsePodsCpu: estypes.SearchResponse<unknown, Record<string, estypes.AggregationsAggregate>>) {
    var message = {};
    var reason = {};
    var alarm = '';
    var cpu_utilization = undefined;
    var cpu_utilization_median = undefined;
    var pods = new Array();
    var cpu_utilizations = new Array();
    if (esResponsePodsCpu.hits.hits.length > 0) {
        const hitsall = esResponsePodsCpu.hits.hits;
        //console.log(hitpodcpu);

        for (const [_, hit] of toEntries(hitsall)) {
            //console.log(hit);
            var pod = {} as Pod;
            const { fields = {} } = hit;
            const name = extractFieldValue(fields['resource.attributes.k8s.pod.name']);
            const namespace = extractFieldValue(fields['resource.attributes.k8s.namespace.name']);
            const podCpuUtilization = round(extractFieldValue(fields['metrics.k8s.pod.cpu.utilization']), 3);

            pod = {
                'name': name,
                'namespace': namespace,
                'memory_availabe': undefined,
                'memory_usage': undefined,
                'cpu_utilization': podCpuUtilization,
            };
            pods.push(pod);
        }

        for (var pod1 of pods) {
            console.log("Name: " + pod1.name, "Available: " + pod1.cpu_utilization);
            cpu_utilizations.push(pod1.cpu_utilization);
        }
        const total_cpu_utilization = cpu_utilizations.reduce((accumulator, currentValue) => accumulator + currentValue);

        // console.log("Sum" + total_cpu_utilization)

        cpu_utilization = total_cpu_utilization / pods.length;
        cpu_utilization_median = median(cpu_utilizations);
        cpu_utilization = round(cpu_utilization, 3);
        if (cpu_utilization < limits["medium"]) {
            alarm = "Low";
        } else if (cpu_utilization >= limits["medium"] && cpu_utilization < limits["high"]) {
            alarm = "Medium";
        } else {
            alarm = "High";
        }
        reason = { 'pod': podName, 'value': alarm, 'desc': ' Cpu utilisation' };
        message = { 'pod': podName, 'cpu_utilization': cpu_utilization, 'cpu_utilization_median': cpu_utilization_median, 'Desc': '% - Percentage of Cpu utilisation' };
    }

    return [reason, message, cpu_utilization, cpu_utilization_median];
}
