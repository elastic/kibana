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
  NODE_MEMORY_ROUTE
} from '../../common/constants';


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
            }),
          },
        },
      },
      async (context, request, response) => {
        const client = (await context.core).elasticsearch.client.asCurrentUser;
        var musts = new Array();
        musts.push(
            { exists: { field: 'metrics.k8s.node.memory.usage' } },
            { exists: { field: 'metrics.k8s.node.memory.available' } },
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
        };
        console.log(dsl);
        const esResponse = await client.search(dsl);
        var message = undefined;
        var reason = undefined;
        var memory_utilization = undefined;
        var memory_usage_median = undefined;
        var memory_usage = undefined;
        var memory_available = undefined;

        console.log(esResponse);
        if (esResponse.hits.hits.length > 0) {
          const firsttHit = esResponse.hits.hits[0];
          const { fields = {} } = firsttHit;
          const time = extractFieldValue(fields['@timestamp']);
          var alarm = '';
          var nodes = new Array();
          var memories_usage = new Array();
          var memories_available = new Array();
          const allhits = esResponse.hits.hits;
          for (const hit of allhits) {
            //console.log(hit);
            var node = {} as Node;
            const { fields = {} } = hit;
            const name = extractFieldValue(fields['resource.attributes.k8s.node.name']);
            memory_available = extractFieldValue(fields['metrics.k8s.node.memory.available']);
            memory_usage = extractFieldValue(fields['metrics.k8s.node.memory.usage']);
            node = {
                'name': name,
                'memory_available': memory_available,
                'memory_usage': memory_usage,
                'cpu_utilization': undefined,
            };
            nodes.push(node);
          }

          for (const n of nodes) {
                console.log("Name: " + n.name, "Available: " + n.memory_available + ", Usage: " + n.memory_usage);
                memories_usage.push(n.memory_usage);
                memories_available.push(n.memory_available);
          }
          const total_memory_usage = memories_usage.reduce((accumulator, currentValue) => accumulator + currentValue);
          memory_usage = total_memory_usage / nodes.length;
          memory_usage_median = median(memories_usage);
          const total_memory_available = memories_available.reduce((accumulator, currentValue) => accumulator + currentValue);

          if (isNaN(total_memory_available)) {
                reason = { 'node': request.query.name, 'value': undefined, 'desc': ' No memory limit defined ' };
                message = { 'node': request.query.name, 'memory_usage': memory_usage, 'memory_usage_median': memory_usage_median, 'desc': ' Pod Memory usage in  Bytes' };
          } else {
                memory_available = total_memory_available / nodes.length;
                memory_utilization = round(memory_usage / memory_available, 3);

                if (memory_utilization < limits["medium"]) {
                    alarm = "Low";
                } else if (memory_utilization >= limits["medium"] && memory_utilization < limits["high"]) {
                    alarm = "Medium";
                } else {
                    alarm = "High";
                }
                reason = { 'node': request.query.name, 'value': alarm, 'desc': ' Memory utilisation' };
                message = { 'node': request.query.name, 'memory_available': memory_available, 'memory_usage': memory_usage, 'memory_utilisation': toPct(memory_utilization), 'memory_usage_median': memory_usage_median, 'Desc': '% - Percentage of Memory utilisation' };

          }
          return response.ok({
                body: {
                  time: time,
                  message: message,
                  name: request.query.name,
                  memory_utilization: toPct(memory_utilization),
                  memory_usage_median: memory_usage_median,
                  memory_available: memory_available,
                  memory_usage: memory_usage,
                  reason: reason,
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