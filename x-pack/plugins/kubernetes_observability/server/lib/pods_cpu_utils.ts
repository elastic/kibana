import { estypes } from '@elastic/elasticsearch';
import { Limits, PodCpu, toPct, extractFieldValue, round } from './utils';
import { ElasticsearchClient } from '@kbn/core/server';

// Define the global CPU limits to categorise cpu utilisation
const limits: Limits = {
    medium: 0.7,
    high: 0.9,
};

// Define the global Deviation limit to categorise cpu_utlization_median_absolute_deviation
const deviation = 0.3 // We define that deviations more than 30% should be looked by the user


export async function getPodsCpu(client: ElasticsearchClient, period: string, podName?: any, namespace?: any, deployment?: any, daemonset?: any ){
    const dsl = defineQueryCpuUtilisation(client, period, podName, namespace, deployment, daemonset);
    console.log(dsl);
    const esResponseAll = await client.search(dsl);
    const { after_key: _, buckets = [] } = (esResponseAll.aggregations?.group_by_category || {}) as any;
    console.log(buckets);
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
            const pod = await calulcatePodsCpuUtilisation(podName, podNs, podNode, client, bucket);
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


export function defineQueryCpuUtilisation(client: ElasticsearchClient, period: string, podName: any, namespace: any, deployment: any, daemonset: any) {
    var mustsPodsCpu = new Array();
    mustsPodsCpu.push(
        { exists: { field: 'metrics.k8s.pod.cpu.utilization' } }
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
                    cpu_utilization: { stats: { field: 'metrics.k8s.pod.cpu.utilization' } },
                    review_variability_cpu_utilization: {
                        median_absolute_deviation: {
                            field: 'metrics.k8s.pod.cpu.utilization'
                        }
                    }
                }
            }
        }
    };
    return dslPodsCpu;
}

export async function calulcatePodsCpuUtilisation(podName: string, namespace: string, node: string, client: any, bucket: any) {
    var alarm = '';
    var pod = {} as PodCpu;

    if (Object.keys(bucket).length > 0) {
        console.log("Pod " + podName + " bucket " + bucket + " namespace " + namespace + " node " + node);
        const cpu_utilization_median_deviation = bucket.review_variability_cpu_utilization.value;
        const cpu_utilization_min = bucket.cpu_utilization.min;
        const cpu_utilization_max = bucket.cpu_utilization.max;
        var cpu_utilization_avg = bucket.cpu_utilization.avg;

        var deviation_alarm = "Low"
        if (cpu_utilization_median_deviation >= deviation) {
            deviation_alarm = "High"
        }

        if (cpu_utilization_avg < limits.medium) {
            alarm = "Low";
        } else if (cpu_utilization_avg >= limits.medium && cpu_utilization_avg < limits.high) {
            alarm = "Medium";
        } else {
            alarm = "High";
        }
        const message = `Pod ${podName} has ${toPct(cpu_utilization_avg)?.toFixed(2)}% cpu utilization, min_cpu_utlization ${toPct(cpu_utilization_min)?.toFixed(2)}%, max_cpu_utlization ${toPct(cpu_utilization_max)?.toFixed(2)}% and ${toPct(cpu_utilization_median_deviation)?.toFixed(2)}% deviation from median cpu_utilization value`

        pod = {
            'name': podName,
            'namespace': namespace,
            'node': node,
            'cpu_utilization': round(cpu_utilization_avg, 3),
            'cpu_utilization_median_deviation': round(cpu_utilization_median_deviation, 3),
            'reason': '',
            'message': message,
            'alarm': alarm,
            'deviation_alarm': deviation_alarm
        };
        console.log(pod);
    }
    return pod;
}

