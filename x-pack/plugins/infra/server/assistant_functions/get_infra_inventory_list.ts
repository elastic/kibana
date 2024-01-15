/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import datemath from '@elastic/datemath';
import { FunctionRegistrationParameters } from '.';
import { getHosts } from '../routes/infra/lib/host/get_hosts';

const NON_EMPTY_STRING = {
  type: 'string' as const,
  minLength: 1,
};

export function registerGetInfraInventoryListFunction({
  libs,
  registerFunction,
  soClient,
  searchClient,
}: FunctionRegistrationParameters) {
  registerFunction(
    {
      name: 'get_infra_hosts',
      contexts: ['infrastructure'],
      description: 'Gets a list of hosts.',
      descriptionForUser: 'Gets a list of hosts.',
      parameters: {
        type: 'object',
        properties: {
          serviceNames: {
            type: 'array',
            items: {
              type: 'string',
              description: 'Optinally filter the hosts by a list of service names.',
            },
          },
          'host.name': {
            ...NON_EMPTY_STRING,
            description: 'Optinally filter the hosts by a host name.',
          },
          start: {
            ...NON_EMPTY_STRING,
            description: 'The start of the time range, in Elasticsearch date math, like `now`.',
          },
          end: {
            ...NON_EMPTY_STRING,
            description: 'The end of the time range, in Elasticsearch date math, like `now-24h`.',
          },
        },
        required: ['start', 'end'],
      } as const,
    },
    async ({ arguments: args }, signal) => {
      const source = await libs.sources.getSourceConfiguration(soClient, 'default');
      const start = datemath.parse(args.start)?.toISOString()!;
      const end = datemath.parse(args.end)?.toISOString()!;

      const hosts = await getHosts({
        params: {
          metrics: [
            { type: 'cpu' },
            { type: 'diskSpaceUsage' },
            { type: 'memory' },
            { type: 'normalizedLoad1m' },
            { type: 'rx' },
            { type: 'tx' },
          ],
          range: {
            from: start,
            to: end,
          },
          limit: 100,
          sourceId: 'default',
          type: 'host',
          query: {
            bool: {
              must: [],
              filter: [
                ...(args.serviceNames
                  ? [
                      {
                        terms: {
                          'service.name': args.serviceNames,
                        },
                      },
                    ]
                  : []),
                ...(args['host.name']
                  ? [
                      {
                        term: {
                          'host.name': {
                            value: args['host.name'],
                          },
                        },
                      },
                    ]
                  : []),
              ],
              should: [],
              must_not: [],
            },
          },
        },
        searchClient,
        sourceConfig: source.configuration,
      });

      const mapped = hosts.nodes.map((host) => ({
        'host.name': host.name,
        metrics: host.metrics.reduce(
          (acc, metric) => ({ ...acc, [metric.name]: metric.value }),
          {} as Record<string, number | null>
        ),
      }));

      return {
        content: mapped,
      };
    }
  );
}
