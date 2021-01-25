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
import { getThroughput } from '../lib/services/get_throughput';
import { getServiceInstances } from '../lib/services/get_service_instances';
import { getServiceMetadataDetails } from '../lib/services/get_service_metadata_details';
import { getServiceMetadataIcons } from '../lib/services/get_service_metadata_icons';

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

export const serviceMetadataDetailsRoute = createRoute({
  endpoint: 'GET /api/apm/services/{serviceName}/metadata/details',
  params: t.type({
    path: t.type({ serviceName: t.string }),
    query: rangeRt,
  }),
  options: { tags: ['access:apm'] },
  handler: async ({ context, request }) => {
    const setup = await setupRequest(context, request);
    const { serviceName } = context.params.path;

    const searchAggregatedTransactions = await getSearchAggregatedTransactions(
      setup
    );

    return getServiceMetadataDetails({
      serviceName,
      setup,
      searchAggregatedTransactions,
    });
  },
});

export const serviceMetadataIconsRoute = createRoute({
  endpoint: 'GET /api/apm/services/{serviceName}/metadata/icons',
  params: t.type({
    path: t.type({ serviceName: t.string }),
    query: rangeRt,
  }),
  options: { tags: ['access:apm'] },
  handler: async ({ context, request }) => {
    const setup = await setupRequest(context, request);
    const { serviceName } = context.params.path;

    const searchAggregatedTransactions = await getSearchAggregatedTransactions(
      setup
    );

    return getServiceMetadataIcons({
      serviceName,
      setup,
      searchAggregatedTransactions,
    });
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
        transactionType: t.string,
      }),
    ]),
  }),
  options: { tags: ['access:apm'] },
  handler: async ({ context, request }) => {
    const setup = await setupRequest(context, request);

    const {
      path: { serviceName },
      query: {
        numBuckets,
        pageIndex,
        size,
        sortDirection,
        sortField,
        transactionType,
      },
    } = context.params;
    return getServiceErrorGroups({
      serviceName,
      setup,
      size,
      numBuckets,
      pageIndex,
      sortDirection,
      sortField,
      transactionType,
    });
  },
});

export const serviceThroughputRoute = createRoute({
  endpoint: 'GET /api/apm/services/{serviceName}/throughput',
  params: t.type({
    path: t.type({
      serviceName: t.string,
    }),
    query: t.intersection([
      t.type({ transactionType: t.string }),
      uiFiltersRt,
      rangeRt,
    ]),
  }),
  options: { tags: ['access:apm'] },
  handler: async ({ context, request }) => {
    const setup = await setupRequest(context, request);
    const { serviceName } = context.params.path;
    const { transactionType } = context.params.query;
    const searchAggregatedTransactions = await getSearchAggregatedTransactions(
      setup
    );

    return getThroughput({
      searchAggregatedTransactions,
      serviceName,
      setup,
      transactionType,
    });
  },
});

export const serviceInstancesRoute = createRoute({
  endpoint: 'GET /api/apm/services/{serviceName}/service_overview_instances',
  params: t.type({
    path: t.type({
      serviceName: t.string,
    }),
    query: t.intersection([
      t.type({ transactionType: t.string, numBuckets: toNumberRt }),
      uiFiltersRt,
      rangeRt,
    ]),
  }),
  options: { tags: ['access:apm'] },
  handler: async ({ context, request }) => {
    const setup = await setupRequest(context, request);
    const { serviceName } = context.params.path;
    const { transactionType, numBuckets } = context.params.query;

    const searchAggregatedTransactions = await getSearchAggregatedTransactions(
      setup
    );

    return getServiceInstances({
      serviceName,
      setup,
      transactionType,
      searchAggregatedTransactions,
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
      t.type({
        environment: t.string,
        numBuckets: toNumberRt,
      }),
      rangeRt,
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
