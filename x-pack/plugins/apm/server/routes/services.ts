/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';
import Boom from '@hapi/boom';
import { uniq } from 'lodash';
import { setupRequest } from '../lib/helpers/setup_request';
import { getServiceAgentName } from '../lib/services/get_service_agent_name';
import { getServices } from '../lib/services/get_services';
import { getServiceTransactionTypes } from '../lib/services/get_service_transaction_types';
import { getServiceNodeMetadata } from '../lib/services/get_service_node_metadata';
import { createRoute } from './create_route';
import { uiFiltersRt, rangeRt } from './default_api_types';
import { getServiceAnnotations } from '../lib/services/annotations';
import { dateAsStringRt } from '../../common/runtime_types/date_as_string_rt';
import { getSearchAggregatedTransactions } from '../lib/helpers/aggregated_transactions';
import { getServiceErrorGroups } from '../lib/services/get_service_error_groups';
import { getServiceDependencies } from '../lib/services/get_service_dependencies';
import { toNumberRt } from '../../common/runtime_types/to_number_rt';
import { getServiceTransactionGroups } from '../lib/services/get_service_transaction_groups';

export const servicesRoute = createRoute({
  endpoint: 'GET /api/apm/services',
  params: t.type({
    query: t.intersection([uiFiltersRt, rangeRt]),
  }),
  options: { tags: ['access:apm'] },
  handler: async ({ context, request }) => {
    const setup = await setupRequest(context, request);

    const searchAggregatedTransactions = await getSearchAggregatedTransactions(
      setup
    );

    const services = await getServices({
      setup,
      searchAggregatedTransactions,
      logger: context.logger,
    });

    return services;
  },
});

export const serviceAgentNameRoute = createRoute({
  endpoint: 'GET /api/apm/services/{serviceName}/agent_name',
  params: t.type({
    path: t.type({
      serviceName: t.string,
    }),
    query: rangeRt,
  }),
  options: { tags: ['access:apm'] },
  handler: async ({ context, request }) => {
    const setup = await setupRequest(context, request);
    const { serviceName } = context.params.path;
    const searchAggregatedTransactions = await getSearchAggregatedTransactions(
      setup
    );

    return getServiceAgentName({
      serviceName,
      setup,
      searchAggregatedTransactions,
    });
  },
});

export const serviceTransactionTypesRoute = createRoute({
  endpoint: 'GET /api/apm/services/{serviceName}/transaction_types',
  params: t.type({
    path: t.type({
      serviceName: t.string,
    }),
    query: rangeRt,
  }),
  options: { tags: ['access:apm'] },
  handler: async ({ context, request }) => {
    const setup = await setupRequest(context, request);
    const { serviceName } = context.params.path;
    return getServiceTransactionTypes({
      serviceName,
      setup,
      searchAggregatedTransactions: await getSearchAggregatedTransactions(
        setup
      ),
    });
  },
});

export const serviceNodeMetadataRoute = createRoute({
  endpoint:
    'GET /api/apm/services/{serviceName}/node/{serviceNodeName}/metadata',
  params: t.type({
    path: t.type({
      serviceName: t.string,
      serviceNodeName: t.string,
    }),
    query: t.intersection([uiFiltersRt, rangeRt]),
  }),
  options: { tags: ['access:apm'] },
  handler: async ({ context, request }) => {
    const setup = await setupRequest(context, request);
    const { serviceName, serviceNodeName } = context.params.path;
    return getServiceNodeMetadata({ setup, serviceName, serviceNodeName });
  },
});

export const serviceAnnotationsRoute = createRoute({
  endpoint: 'GET /api/apm/services/{serviceName}/annotation/search',
  params: t.type({
    path: t.type({
      serviceName: t.string,
    }),
    query: t.intersection([
      rangeRt,
      t.partial({
        environment: t.string,
      }),
    ]),
  }),
  options: { tags: ['access:apm'] },
  handler: async ({ context, request }) => {
    const setup = await setupRequest(context, request);
    const { serviceName } = context.params.path;
    const { environment } = context.params.query;

    const [
      annotationsClient,
      searchAggregatedTransactions,
    ] = await Promise.all([
      context.plugins.observability?.getScopedAnnotationsClient(
        context,
        request
      ),
      getSearchAggregatedTransactions(setup),
    ]);

    return getServiceAnnotations({
      setup,
      searchAggregatedTransactions,
      serviceName,
      environment,
      annotationsClient,
      apiCaller: context.core.elasticsearch.legacy.client.callAsCurrentUser,
      logger: context.logger,
    });
  },
});

export const serviceAnnotationsCreateRoute = createRoute({
  endpoint: 'POST /api/apm/services/{serviceName}/annotation',
  options: {
    tags: ['access:apm', 'access:apm_write'],
  },
  params: t.type({
    path: t.type({
      serviceName: t.string,
    }),
    body: t.intersection([
      t.type({
        '@timestamp': dateAsStringRt,
        service: t.intersection([
          t.type({
            version: t.string,
          }),
          t.partial({
            environment: t.string,
          }),
        ]),
      }),
      t.partial({
        message: t.string,
        tags: t.array(t.string),
      }),
    ]),
  }),
  handler: async ({ request, context }) => {
    const annotationsClient = await context.plugins.observability?.getScopedAnnotationsClient(
      context,
      request
    );

    if (!annotationsClient) {
      throw Boom.notFound();
    }

    const { body, path } = context.params;

    return annotationsClient.create({
      message: body.service.version,
      ...body,
      annotation: {
        type: 'deployment',
      },
      service: {
        ...body.service,
        name: path.serviceName,
      },
      tags: uniq(['apm'].concat(body.tags ?? [])),
    });
  },
});

export const serviceErrorGroupsRoute = createRoute({
  endpoint: 'GET /api/apm/services/{serviceName}/error_groups',
  params: t.type({
    path: t.type({
      serviceName: t.string,
    }),
    query: t.intersection([
      rangeRt,
      uiFiltersRt,
      t.type({
        size: toNumberRt,
        numBuckets: toNumberRt,
        pageIndex: toNumberRt,
        sortDirection: t.union([t.literal('asc'), t.literal('desc')]),
        sortField: t.union([
          t.literal('last_seen'),
          t.literal('occurrences'),
          t.literal('name'),
        ]),
      }),
    ]),
  }),
  options: { tags: ['access:apm'] },
  handler: async ({ context, request }) => {
    const setup = await setupRequest(context, request);

    const {
      path: { serviceName },
      query: { size, numBuckets, pageIndex, sortDirection, sortField },
    } = context.params;
    return getServiceErrorGroups({
      serviceName,
      setup,
      size,
      numBuckets,
      pageIndex,
      sortDirection,
      sortField,
    });
  },
});

export const serviceTransactionGroupsRoute = createRoute({
  endpoint: 'GET /api/apm/services/{serviceName}/overview_transaction_groups',
  params: t.type({
    path: t.type({ serviceName: t.string }),
    query: t.intersection([
      rangeRt,
      uiFiltersRt,
      t.type({
        size: toNumberRt,
        numBuckets: toNumberRt,
        pageIndex: toNumberRt,
        sortDirection: t.union([t.literal('asc'), t.literal('desc')]),
        sortField: t.union([
          t.literal('latency'),
          t.literal('throughput'),
          t.literal('errorRate'),
          t.literal('impact'),
        ]),
      }),
    ]),
  }),
  options: {
    tags: ['access:apm'],
  },
  handler: async ({ context, request }) => {
    const setup = await setupRequest(context, request);

    const searchAggregatedTransactions = await getSearchAggregatedTransactions(
      setup
    );

    const {
      path: { serviceName },
      query: { size, numBuckets, pageIndex, sortDirection, sortField },
    } = context.params;

    return getServiceTransactionGroups({
      setup,
      serviceName,
      pageIndex,
      searchAggregatedTransactions,
      size,
      sortDirection,
      sortField,
      numBuckets,
    });
  },
});

export const serviceDependenciesRoute = createRoute({
  endpoint: 'GET /api/apm/services/{serviceName}/dependencies',
  params: t.type({
    path: t.type({
      serviceName: t.string,
    }),
    query: t.intersection([
      rangeRt,
      t.type({ environment: t.string, numBuckets: toNumberRt }),
    ]),
  }),
  options: {
    tags: ['access:apm'],
  },
  handler: async ({ context, request }) => {
    const setup = await setupRequest(context, request);

    const { serviceName } = context.params.path;
    const { environment, numBuckets } = context.params.query;

    return getServiceDependencies({
      serviceName,
      environment,
      setup,
      numBuckets,
    });
  },
});
