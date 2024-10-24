/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';
import { estypes } from '@elastic/elasticsearch';
// import { transformError } from '@kbn/securitysolution-es-utils';
// import type { ElasticsearchClient } from '@kbn/core/server';
import { extractFieldValue, Limits, NodeMem, round, toPct, checkDefaultPeriod } from '../lib/utils';
import { IRouter, Logger } from '@kbn/core/server';
import {
  NODE_MEMORY_ROUTE
} from '../../common/constants';
import { MaybePromise } from '@kbn/utility-types';


// Define the global CPU limits to categorise cpu utilisation
const limits: Limits = {
    medium: 0.7,
    high: 0.9,
};

export const registerNodesMemoryRoute = (router: IRouter, logger: Logger) => {
  router.versioned
    .get({
      access: 'internal',
      path: NODE_MEMORY_ROUTE,
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            query: schema.object({
              name: schema.maybe(schema.string()),
              period: schema.maybe(schema.string())
            }),
          },
        },
      },
      async (context, request, response:MaybePromise<any>) => {
        const client = (await context.core).elasticsearch.client.asCurrentUser;
        const period = checkDefaultPeriod(request.query.period);
        var musts = new Array();
        musts.push(
            { exists: { field: 'metrics.k8s.node.memory.usage' } },
            { exists: { field: 'metrics.k8s.node.memory.available' } },
        );
        const filter = [
            {
                range: {
                    "@timestamp": {
                        "gte": period
                    }
                }
            }
        ]
        if (request.query.name !== undefined) {
            musts.push(
                {
                    term: {
                        'resource.attributes.k8s.node.name': request.query.name,
                    },
                },
            )
        };
        const dsl: estypes.SearchRequest = {
            index: ["metrics-otel.*"],
            sort: [{ '@timestamp': 'desc' }],
            _source: false,
            fields: [
                '@timestamp',
                'metrics.k8s.node.memory.usage',
                'metrics.k8s.node.memory.available',
                'resource.attributes.k8s.*',
            ],
            query: {
                bool: {
                    must: musts,
                    filter: filter,
                },
            },
            aggs: {
                "group_by_category": {
                    terms: {
                        field: "resource.attributes.k8s.node.name" 
                    },
                    aggs: {
                        "stats_memory": {
                            "stats": {field: "metrics.k8s.node.memory.usage"}
                        },
                        "review_variability_memory_usage": {
                            median_absolute_deviation: {
                                field: "metrics.k8s.node.memory.usage" 
                              }
                        },
                        "stats_available": { stats: {field: "metrics.k8s.node.memory.available"}},
                        "review_variability_memory_available": {
                            median_absolute_deviation: {
                                field: "metrics.k8s.node.memory.available" 
                              }
                        },
                    }
                }
            }
        };
        // console.log(dsl);
        const esResponse = await client.search(dsl);
        // console.log(esResponse);
        
        var time = '';
        if (esResponse.hits.hits.length > 0) {
            const firsttHit = esResponse.hits.hits[0];
            const { fields = {} } = firsttHit;
            time = extractFieldValue(fields['@timestamp']);
        }
        const { after_key: _, buckets = [] } = (esResponse.aggregations?.group_by_category || {}) as any;
        if (buckets.length > 0) {
            var nodes = new Array();
            const getNodes =  buckets.map(async (bucket: any) => {
              const name = bucket.key;
              const [memoryAlloc, _] = await getNodeAllocMemCpu(client, name, period);
              console.log("Each bucket");
              var nodeMem = {} as NodeMem;
              var alarm = '';
              
              const memory_available = bucket.stats_available.avg;
              const memory_usage = bucket.stats_memory.avg;
              const memory_usage_median_deviation = bucket.review_variability_memory_usage.value;
              var memory_utilization = undefined;
              if (memoryAlloc !== undefined){
                memory_utilization = round(memory_usage / memoryAlloc, 3);
                if (memory_utilization < limits["medium"]) {
                    alarm = "Low";
                } else if (memory_utilization >= limits["medium"] && memory_utilization < limits["high"]) {
                    alarm = "Medium";
                } else {
                    alarm = "High";
                }
              }
              const reason = `Node ${name} has ${alarm} memory utilization`
              const message = `Node ${name} has ${memory_available.toFixed(1)} bytes memory available, ${memory_usage.toFixed(1)} bytes memory usage, ${toPct(memory_utilization)?.toFixed(1)}% memory_utilisation and ${memory_usage_median_deviation.toFixed(1)} bytes deviation from median value.`
              nodeMem = {
                  'name': name,
                  'memory_available': memory_available,
                  'memory_usage': memory_usage,
                  'memory_utilization': memory_utilization,
                  'memory_usage_median_deviation': memory_usage_median_deviation,
                  'alarm': alarm,
                  'message': message,
                  'reason': reason
              };
              nodes.push(nodeMem);
            });
            return Promise.all(getNodes).then(() => {
                return response.ok({
                    body: {
                        time: time,
                        nodes: nodes,
                    },
                });
            });
            
        } else {
            var notFoundMessage = '';
            if (request.query.name !== undefined) {
                notFoundMessage = `Node ${request.query.name} was not found`
            } else {
                notFoundMessage = "No kubernetes node was found";
            }
            return response.ok({
                body: {
                time: '',
                message: notFoundMessage,
                name: request.query.name,
                reason: "Not found",
                nodes: [],
                },
            });
        };
    },
    );
};


export async function getNodeAllocMemCpu(client: any, node: string, period: string): Promise<[any, any]>{

    const musts = [
        {
          term: {
            'resource.attributes.k8s.node.name': node,
          },
        },
        { exists: { field: 'metrics.k8s.node.allocatable_memory' } },
        { exists: { field: 'metrics.k8s.node.allocatable_cpu' } },
    ];
  
    const filter = [
      {
          range: {
              "@timestamp": {
                  "gte": period
              }
          }
      }
    ]
    const dsl: estypes.SearchRequest = {
      index: ["metrics-otel.*"],
      size: 1,
      sort: [{ '@timestamp': 'desc' }],
      _source: false,
      fields: [
        'metrics.k8s.node.allocatable_memory',
        'metrics.k8s.node.allocatable_cpu',
      ],
      query: {
        bool: {
          must: musts,
          filter: filter
        },
      },
    };
  
    const esResponse = await client.search(dsl);
    var memoryAlloc = undefined;
    var cpuAlloc = undefined;
    if (esResponse.hits.hits.length > 0) {
      const hit = esResponse.hits.hits[0];
      const { fields = {} } = hit;
      memoryAlloc = extractFieldValue(fields['metrics.k8s.node.allocatable_memory']);
      cpuAlloc = extractFieldValue(fields['metrics.k8s.node.allocatable_cpu']);
    }
    return [memoryAlloc, cpuAlloc];
  }