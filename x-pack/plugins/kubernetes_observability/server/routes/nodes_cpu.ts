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
import { extractFieldValue, Limits, NodeCpu, round, toPct, checkDefaultPeriod } from '../lib/utils';
import { IRouter, Logger } from '@kbn/core/server';
import {
  NODE_CPU_ROUTE
} from '../../common/constants';


// Define the global CPU limits to categorise cpu utilisation
const limits: Limits = {
    medium: 0.7,
    high: 0.9,
};

export const registerNodesCpuRoute = (router: IRouter, logger: Logger) => {
  router.versioned
    .get({
      access: 'internal',
      path: NODE_CPU_ROUTE,
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
      async (context, request, response: any) => {
        const client = (await context.core).elasticsearch.client.asCurrentUser;
        const period = checkDefaultPeriod(request.query.period);
        var musts = new Array();
        musts.push(
            { exists: { field: 'metrics.k8s.node.cpu.utilization' } },
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
                'metrics.k8s.node.cpu.utilization',
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
                        "stats_cpu": {
                            "stats": {field: "metrics.k8s.node.cpu.utilization"}
                        },
                        "review_variability_cpu_utilization": {
                            median_absolute_deviation: {
                                field: "metrics.k8s.node.cpu.utilization" 
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
          if (esResponse.hits.hits.length > 0) {
            var nodes = new Array();
            buckets.map((bucket: any) => {
              var nodeCpu = {} as NodeCpu;
              var alarm = '';
              const name = bucket.key;
              const cpu_utilization = bucket.stats_cpu.avg;
              const cpu_utilization_median_deviation = bucket.review_variability_cpu_utilization.value;
              const rounded_cpu_utilization_median_deviation = round(cpu_utilization_median_deviation, 3);
              const rounded_cpu_utilization = round(cpu_utilization, 3);
              if (cpu_utilization < limits["medium"]) {
                alarm = "Low";
              } else if (cpu_utilization >= limits["medium"] && cpu_utilization < limits["high"]) {
                    alarm = "Medium";
              } else {
                    alarm = "High";
              }
              const reason = `Node ${name} has ${alarm} cpu utilization`
              const message = `Node ${name} has ${(toPct(rounded_cpu_utilization))?.toFixed(1) }% cpu utilisation and ${(toPct(rounded_cpu_utilization_median_deviation))?.toFixed(1) }% deviation from median value.`
              nodeCpu = {
                  'name': name,
                  'cpu_utilization': rounded_cpu_utilization,
                  'cpu_utilization_median_deviation': rounded_cpu_utilization_median_deviation,
                  'alarm': alarm,
                  'message': message,
                  'reason': reason
              };
              nodes.push(nodeCpu);
            });

            return response.ok({
                  body: {
                    time: time,
                    nodes: nodes,
                  },
            });
          }
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