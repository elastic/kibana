import { estypes } from '@elastic/elasticsearch';
import { round, PodMem, Limits, toPct, extractFieldValue } from './utils';
import { ElasticsearchClient } from '@kbn/core/server';
import { getNodeAllocMemCpu } from '../routes/nodes_memory';

// Define the global CPU limits to categorise memory utilisation
const limits: Limits = {
    medium: 0.7,
    high: 0.9,
};

// Define the global Deviation limit to categorise memory memory_usage_median_absolute_deviation
const deviation = 5e+7 // We define that deviations more than 50Megabytes should be looked by the user

export function defineQueryForAllPodsMemoryUtilisation(podName: string, namespace: any, client: ElasticsearchClient, period: string) {
    var mustsPodsCpu = new Array;
    mustsPodsCpu.push(
        {
            term: {
                'resource.attributes.k8s.pod.name': podName,
            },
        },
        { exists: { field: 'metrics.k8s.pod.memory.usage' } }
    )
    if (namespace !== undefined) {
        mustsPodsCpu.push(
            {
                term: {
                    'resource.attributes.k8s.namespace.name': namespace,
                },
            }
        )
    }
    const filter = [
        {
            range: {
                "@timestamp": {
                    "gte": period
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


export async function calulcatePodsMemoryUtilisation(podName: string, namespace: string, node: string, client: any, bucket: any) {
    var alarm = '';
    var memory_utilization = undefined;
    var pod = {} as PodMem;

    if (Object.keys(bucket).length > 0) {
        console.log("Pod " + podName + " bucket " + bucket + " namespace " + namespace + " node " + node);
        var memory_available = bucket.stats_available.avg;
        const memory_usage = bucket.stats_memory.avg;
        const memory_usage_median_deviation = bucket.review_variability_memory_usage.value;
        var reason = undefined;
        var message = undefined;

        var deviation_alarm = "Low"
        if (memory_usage_median_deviation >= deviation) {
            var deviation_alarm = "High"
        }
        if (memory_available === null) {
            const [memoryAlloc, _] = await getNodeAllocMemCpu(client, node);
            if (memoryAlloc !== undefined){
                memory_available = memoryAlloc;
            }
        }
        if (memory_available === null) {
            reason = 'Metric memory_available value is not defined'
            message = `Pod ${podName} has ${memory_usage} bytes memory usage.`
            alarm = '';
        } else {
            memory_utilization = round(memory_usage / (memory_available + memory_usage), 3);

            if (memory_utilization < limits.medium) {
                alarm = "Low";
            } else if (memory_utilization >= limits.medium && memory_utilization < limits.high) {
                alarm = "Medium";
            } else {
                alarm = "High";
            }
            reason = '';
            message = `Pod ${podName} has ${memory_available} bytes memory available, ${memory_usage} bytes memory usage, ${toPct(memory_utilization)?.toFixed(1)}% memory utilisation and ${memory_usage_median_deviation} bytes deviation from median value`
        }

        pod = {
            'name': podName,
            'namespace': namespace,
            'node': node,
            'memory_available': memory_available,
            'memory_usage': memory_usage,
            'memory_usage_median_deviation': memory_usage_median_deviation,
            'memory_utilization': memory_utilization,
            'reason': reason,
            'message': message,
            'alarm': alarm,
            'deviation_alarm': deviation_alarm
        };
        console.log(pod);
    }
    return pod;
}

export async function getPodsMemory(client: ElasticsearchClient, period: string, podName?: any, namespace?: any, deployment?: any, daemonset?: any ){
    const dsl = defineQueryGeneralMemoryUtilisation(client, period, podName, namespace, deployment, daemonset);
    console.log(dsl);
    const esResponseAll = await client.search(dsl);
    const { after_key: _, buckets = [] } = (esResponseAll.aggregations?.group_by_category || {}) as any;
    if (buckets.length > 0) {
        const hits = esResponseAll.hits.hits[0];
        const { fields = {} } = hits;
        const time = extractFieldValue(fields['@timestamp']);
        var pods = new Array();
        for (const bucket of buckets) {
            console.log(bucket);
            const podName = bucket.key[0];
            const podNs = bucket.key[1];
            const podNode = bucket.key[2];
            console.log(podName + podNs + podNode);
            const pod = await calulcatePodsMemoryUtilisation(podName, podNs, podNode, client, bucket);
            pods.push(pod);
            console.log(pod.name);
        }
        return {
            time: time,
            pods: pods
        }
    }
    return null
}


export function defineQueryGeneralMemoryUtilisation(client: ElasticsearchClient, period: string, podName: any, namespace: any, deployment: any, daemonset: any) {
    var mustsPodsCpu = new Array();
    mustsPodsCpu.push(
        { exists: { field: 'metrics.k8s.pod.memory.usage' } }
    )

    if (namespace !== undefined) {
        mustsPodsCpu.push(
            {
                term: {
                    'resource.attributes.k8s.namespace.name': namespace,
                },
            }
        )
    }

    if (podName !== undefined) {
        mustsPodsCpu.push(
            {
                term: {
                    'resource.attributes.k8s.pod.name': podName,
                },
            }
        )
    }

    if (deployment !== undefined) {
        mustsPodsCpu.push(
            {
                term: {
                    'resource.attributes.k8s.deployment.name': deployment,
                },
            }
        )
    }

    if (daemonset !== undefined) {
        mustsPodsCpu.push(
            {
                term: {
                    'resource.attributes.k8s.daemonset.name': daemonset,
                },
            }
        )
    }

    const filter = [
        {
            range: {
                "@timestamp": {
                    "gte": period
                }
            }
        }
    ]
    console.log(mustsPodsCpu);
    const dslPodsCpu: estypes.SearchRequest = {
        index: ["metrics-otel.*"],
        _source: false,
        sort: [{ '@timestamp': 'desc' }],
        fields: [
            '@timestamp',
            'metrics.k8s.pod.memory.usage',
            'metrics.k8s.pod.memory.available',
            'resource.attributes.k8s.*',
        ],
        query: {
            bool: {
                must: mustsPodsCpu,
                filter: filter,
            },
        },

        aggs: {
            "group_by_category": {
                multi_terms: {
                    terms: [{
                      field: "resource.attributes.k8s.pod.name"
                    }, {
                      field: "resource.attributes.k8s.namespace.name"
                    },
                    {
                        field: "resource.attributes.k8s.node.name"
                    }],
                    size: 500 
                },
                aggs: {
                    "stats_memory": {
                        "stats": { field: "metrics.k8s.pod.memory.usage" }
                    },
                    "review_variability_memory_usage": {
                        median_absolute_deviation: {
                            field: "metrics.k8s.pod.memory.usage"
                        }
                    },
                    "stats_available": {
                        stats: { field: "metrics.k8s.pod.memory.available" }
                    },
                    "review_variability_memory_available": {
                        median_absolute_deviation: {
                            field: "metrics.k8s.pod.memory.available"
                        }
                    },
                }
            }
        }
    };
    return dslPodsCpu;
}


export function calulcateNodesMemory(node: string, client: ElasticsearchClient) {
    const mustsPodsCpu = [
        {
            term: {
                'resource.attributes.k8s.node.name': node,
            },
        },
        { exists: { field: 'metrics.k8s.node.memory.available' } }
    ];

    const dslNode: estypes.SearchRequest = {
        index: ["metrics-otel.*"],
        _source: false,
        sort: [{ '@timestamp': 'desc' }],
        size: 1,
        fields: [
            '@timestamp',
            'metrics.k8s.node.memory.*',
            'resource.attributes.k8s.*',
        ],
        query: {
            bool: {
                must: mustsPodsCpu,
            },
        },
    };
    return dslNode;
}