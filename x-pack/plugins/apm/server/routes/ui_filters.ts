/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';
import { omit } from 'lodash';
import {
  setupRequest,
  Setup,
  SetupTimeRange,
} from '../lib/helpers/setup_request';
import { getEnvironments } from '../lib/ui_filters/get_environments';
import { Projection } from '../projections/typings';
import { localUIFilterNames } from '../lib/ui_filters/local_ui_filters/config';
import { getEsFilter } from '../lib/helpers/convert_ui_filters/get_es_filter';
import { getLocalUIFilters } from '../lib/ui_filters/local_ui_filters';
import { getServicesProjection } from '../projections/services';
import { getTransactionGroupsProjection } from '../projections/transaction_groups';
import { getMetricsProjection } from '../projections/metrics';
import { getErrorGroupsProjection } from '../projections/errors';
import { getTransactionsProjection } from '../projections/transactions';
import { createRoute } from './create_route';
import { uiFiltersRt, rangeRt } from './default_api_types';
import { jsonRt } from '../../common/runtime_types/json_rt';
import { getServiceNodesProjection } from '../projections/service_nodes';
import { getRumPageLoadTransactionsProjection } from '../projections/rum_page_load_transactions';
import { getSearchAggregatedTransactions } from '../lib/helpers/aggregated_transactions';
import { APMRequestHandlerContext } from './typings';
import { LocalUIFilterName } from '../../common/ui_filter';

export const uiFiltersEnvironmentsRoute = createRoute({
  endpoint: 'GET /api/apm/ui_filters/environments',
  params: t.type({
    query: t.intersection([
      t.partial({
        serviceName: t.string,
      }),
      rangeRt,
    ]),
  }),
  options: { tags: ['access:apm'] },
  handler: async ({ context, request }) => {
    const setup = await setupRequest(context, request);
    const { serviceName } = context.params.query;
    const searchAggregatedTransactions = await getSearchAggregatedTransactions(
      setup
    );

    return getEnvironments({
      setup,
      serviceName,
      searchAggregatedTransactions,
    });
  },
});

const filterNamesRt = t.type({
  filterNames: jsonRt.pipe(
    t.array(
      t.keyof(
        Object.fromEntries(
          localUIFilterNames.map((filterName) => [filterName, null])
        ) as Record<LocalUIFilterName, null>
      )
    )
  ),
});

const localUiBaseQueryRt = t.intersection([
  filterNamesRt,
  uiFiltersRt,
  rangeRt,
]);

function createLocalFiltersRoute<
  TEndpoint extends string,
  TProjection extends Projection,
  TQueryRT extends t.HasProps
>({
  endpoint,
  getProjection,
  queryRt,
}: {
  endpoint: TEndpoint;
  getProjection: GetProjection<
    TProjection,
    t.IntersectionC<[TQueryRT, BaseQueryType]>
  >;
  queryRt: TQueryRT;
}) {
  return createRoute({
    endpoint,
    params: t.type({
      query: t.intersection([localUiBaseQueryRt, queryRt]),
    }),
    options: { tags: ['access:apm'] },
    handler: async ({ context, request }) => {
      const setup = await setupRequest(context, request);
      const { uiFilters } = setup;
      const { query } = context.params;

      const { filterNames } = query;
      const projection = await getProjection({
        query,
        context,
        setup: {
          ...setup,
          esFilter: getEsFilter(omit(uiFilters, filterNames)),
        },
      });

      return getLocalUIFilters({
        projection,
        setup,
        uiFilters,
        localFilterNames: filterNames,
      });
    },
  });
}

export const servicesLocalFiltersRoute = createLocalFiltersRoute({
  endpoint: `GET /api/apm/ui_filters/local_filters/services`,
  getProjection: async ({ context, setup }) => {
    const searchAggregatedTransactions = await getSearchAggregatedTransactions(
      setup
    );

    return getServicesProjection({ setup, searchAggregatedTransactions });
  },
  queryRt: t.type({}),
});

export const transactionGroupsLocalFiltersRoute = createLocalFiltersRoute({
  endpoint: 'GET /api/apm/ui_filters/local_filters/transactionGroups',
  getProjection: async ({ context, setup, query }) => {
    const { transactionType, serviceName, transactionName } = query;

    const searchAggregatedTransactions = await getSearchAggregatedTransactions(
      setup
    );

    return getTransactionGroupsProjection({
      setup,
      options: {
        type: 'top_transactions',
        transactionType,
        serviceName,
        transactionName,
        searchAggregatedTransactions,
      },
    });
  },
  queryRt: t.intersection([
    t.type({
      serviceName: t.string,
      transactionType: t.string,
    }),
    t.partial({
      transactionName: t.string,
    }),
  ]),
});

export const tracesLocalFiltersRoute = createLocalFiltersRoute({
  endpoint: 'GET /api/apm/ui_filters/local_filters/traces',
  getProjection: async ({ setup, context }) => {
    const searchAggregatedTransactions = await getSearchAggregatedTransactions(
      setup
    );

    return getTransactionGroupsProjection({
      setup,
      options: { type: 'top_traces', searchAggregatedTransactions },
    });
  },
  queryRt: t.type({}),
});

export const transactionsLocalFiltersRoute = createLocalFiltersRoute({
  endpoint: 'GET /api/apm/ui_filters/local_filters/transactions',
  getProjection: async ({ context, setup, query }) => {
    const { transactionType, serviceName, transactionName } = query;

    const searchAggregatedTransactions = await getSearchAggregatedTransactions(
      setup
    );

    return getTransactionsProjection({
      setup,
      transactionType,
      serviceName,
      transactionName,
      searchAggregatedTransactions,
    });
  },
  queryRt: t.type({
    transactionType: t.string,
    transactionName: t.string,
    serviceName: t.string,
  }),
});

export const metricsLocalFiltersRoute = createLocalFiltersRoute({
  endpoint: 'GET /api/apm/ui_filters/local_filters/metrics',
  getProjection: ({ setup, query }) => {
    const { serviceName, serviceNodeName } = query;
    return getMetricsProjection({
      setup,
      serviceName,
      serviceNodeName,
    });
  },
  queryRt: t.intersection([
    t.type({
      serviceName: t.string,
    }),
    t.partial({
      serviceNodeName: t.string,
    }),
  ]),
});

export const errorGroupsLocalFiltersRoute = createLocalFiltersRoute({
  endpoint: 'GET /api/apm/ui_filters/local_filters/errorGroups',
  getProjection: ({ setup, query }) => {
    const { serviceName } = query;
    return getErrorGroupsProjection({
      setup,
      serviceName,
    });
  },
  queryRt: t.type({
    serviceName: t.string,
  }),
});

export const serviceNodesLocalFiltersRoute = createLocalFiltersRoute({
  endpoint: 'GET /api/apm/ui_filters/local_filters/serviceNodes',
  getProjection: ({ setup, query }) => {
    const { serviceName } = query;
    return getServiceNodesProjection({
      setup,
      serviceName,
    });
  },
  queryRt: t.type({
    serviceName: t.string,
  }),
});

export const rumOverviewLocalFiltersRoute = createLocalFiltersRoute({
  endpoint: 'GET /api/apm/ui_filters/local_filters/rumOverview',
  getProjection: async ({ setup }) => {
    return getRumPageLoadTransactionsProjection({
      setup,
    });
  },
  queryRt: t.type({}),
});

type BaseQueryType = typeof localUiBaseQueryRt;

type GetProjection<
  TProjection extends Projection,
  TQueryRT extends t.HasProps
> = ({
  query,
  setup,
  context,
}: {
  query: t.TypeOf<TQueryRT>;
  setup: Setup & SetupTimeRange;
  context: APMRequestHandlerContext;
}) => Promise<TProjection> | TProjection;
