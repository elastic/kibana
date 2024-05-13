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
import { extractFieldValue, Limits, Node, round, median, toPct } from '../lib/utils';
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
            }),
          },
        },
      },
      async (context, request, response) => {
        const client = (await context.core).elasticsearch.client.asCurrentUser;
        var musts = new Array();
        musts.push(
            { exists: { field: 'metrics.k8s.node.cpu.utilization' } }
        );
        const filter = [
            {
                range: {
                    "@timestamp": {
                        "gte": "now-5m"
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
        };
        console.log(dsl);
        const esResponse = await client.search(dsl);
        var message = undefined;
        var reason = undefined;
        var cpu_utilization = undefined;
        var cpu_utilization_median = undefined;
        console.log(esResponse);
        if (esResponse.hits.hits.length > 0) {
          const firsttHit = esResponse.hits.hits[0];
          const { fields = {} } = firsttHit;
          const time = extractFieldValue(fields['@timestamp']);

          var message = undefined;
          var reason = undefined;
          var alarm = '';
          var cpu_utilization = undefined;
          var cpu_utilization_median = undefined;
          var nodes = new Array();
          var cpu_utilizations = new Array();
          const allhits = esResponse.hits.hits;
          for (const hit of allhits) {
            //console.log(hit);
            var node = {} as Node;
            const { fields = {} } = hit;
            const name = extractFieldValue(fields['resource.attributes.k8s.node.name']);
            const nodeCpuUtilization = round(extractFieldValue(fields['metrics.k8s.node.cpu.utilization']), 3);

            node = {
                'name': name,
                'memory_availabe': undefined,
                'memory_usage': undefined,
                'cpu_utilization': nodeCpuUtilization,
            };
            nodes.push(node);
          }

          for (const n of nodes) {
                console.log("Name: " + n.name, "Available: " + n.cpu_utilization);
                cpu_utilizations.push(n.cpu_utilization);
          }
            const total_cpu_utilization = cpu_utilizations.reduce((accumulator, currentValue) => accumulator + currentValue);

            // console.log("Sum" + total_cpu_utilization)

            cpu_utilization = total_cpu_utilization / nodes.length;
            cpu_utilization_median = median(cpu_utilizations);
            cpu_utilization = round(cpu_utilization, 3);
            if (cpu_utilization < limits["medium"]) {
                alarm = "Low";
            } else if (cpu_utilization >= limits["medium"] && cpu_utilization < limits["high"]) {
                alarm = "Medium";
            } else {
                alarm = "High";
            }
            reason = { 'node': request.query.name, 'value': alarm, 'desc': ' Cpu utilisation' };
            message = { 'node': request.query.name, 'cpu_utilization': toPct(cpu_utilization), 'cpu_utilization_median': toPct(cpu_utilization_median), 'Desc': '% - Percentage of Cpu utilisation' };
            return response.ok({
                body: {
                  time: time,
                  name: request.query.name,
                  cpu_utilization: toPct(cpu_utilization),
                  cpu_utilization_median: toPct(cpu_utilization_median),
                  message: message,
                  reason: reason
                },
            });
        } else {
          const message = `Node ${request.query.name} not found`
          return response.ok({
            body: {
              time: '',
              message: message,
              name: request.query.name,
              reason: "Not found",
            },
          });
        };
    },
    );
};