/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';
import { setupRequest } from '../lib/helpers/setup_request';
import { getTransactionCharts } from '../lib/transactions/charts';
import { getTransactionDistribution } from '../lib/transactions/distribution';
import { getTransactionBreakdown } from '../lib/transactions/breakdown';
import { getTransactionGroupList } from '../lib/transaction_groups';
import { createRoute } from './create_route';
import { uiFiltersRt, rangeRt } from './default_api_types';
import { getTransactionAvgDurationByBrowser } from '../lib/transactions/avg_duration_by_browser';
import { getTransactionAvgDurationByCountry } from '../lib/transactions/avg_duration_by_country';

export const transactionGroupsRoute = createRoute(() => ({
  path: '/api/apm/services/{serviceName}/transaction_groups',
  params: {
    path: t.type({
      serviceName: t.string
    }),
    query: t.intersection([
      t.type({
        transactionType: t.string
      }),
      uiFiltersRt,
      rangeRt
    ])
  },
  handler: async ({ context, request }) => {
    const setup = await setupRequest(context, request);
    const { serviceName } = context.params.path;
    const { transactionType } = context.params.query;

    return getTransactionGroupList(
      {
        type: 'top_transactions',
        serviceName,
        transactionType
      },
      setup
    );
  }
}));

export const transactionGroupsChartsRoute = createRoute(() => ({
  path: '/api/apm/services/{serviceName}/transaction_groups/charts',
  params: {
    path: t.type({
      serviceName: t.string
    }),
    query: t.intersection([
      t.partial({
        transactionType: t.string,
        transactionName: t.string
      }),
      uiFiltersRt,
      rangeRt
    ])
  },
  handler: async ({ context, request }) => {
    const setup = await setupRequest(context, request);
    const { serviceName } = context.params.path;
    const { transactionType, transactionName } = context.params.query;

    return getTransactionCharts({
      serviceName,
      transactionType,
      transactionName,
      setup
    });
  }
}));

export const transactionGroupsDistributionRoute = createRoute(() => ({
  path: '/api/apm/services/{serviceName}/transaction_groups/distribution',
  params: {
    path: t.type({
      serviceName: t.string
    }),
    query: t.intersection([
      t.type({
        transactionType: t.string,
        transactionName: t.string
      }),
      t.partial({
        transactionId: t.string,
        traceId: t.string
      }),
      uiFiltersRt,
      rangeRt
    ])
  },
  handler: async ({ context, request }) => {
    const setup = await setupRequest(context, request);
    const { serviceName } = context.params.path;
    const {
      transactionType,
      transactionName,
      transactionId = '',
      traceId = ''
    } = context.params.query;

    return getTransactionDistribution({
      serviceName,
      transactionType,
      transactionName,
      transactionId,
      traceId,
      setup
    });
  }
}));

export const transactionGroupsBreakdownRoute = createRoute(() => ({
  path: '/api/apm/services/{serviceName}/transaction_groups/breakdown',
  params: {
    path: t.type({
      serviceName: t.string
    }),
    query: t.intersection([
      t.type({
        transactionType: t.string
      }),
      t.partial({
        transactionName: t.string
      }),
      uiFiltersRt,
      rangeRt
    ])
  },
  handler: async ({ context, request }) => {
    const setup = await setupRequest(context, request);
    const { serviceName } = context.params.path;
    const { transactionName, transactionType } = context.params.query;

    return getTransactionBreakdown({
      serviceName,
      transactionName,
      transactionType,
      setup
    });
  }
}));

export const transactionGroupsAvgDurationByBrowser = createRoute(() => ({
  path: `/api/apm/services/{serviceName}/transaction_groups/avg_duration_by_browser`,
  params: {
    path: t.type({
      serviceName: t.string
    }),
    query: t.intersection([
      t.partial({
        transactionType: t.string,
        transactionName: t.string
      }),
      uiFiltersRt,
      rangeRt
    ])
  },
  handler: async ({ context, request }) => {
    const setup = await setupRequest(context, request);
    const { serviceName } = context.params.path;

    return getTransactionAvgDurationByBrowser({
      serviceName,
      setup
    });
  }
}));

export const transactionGroupsAvgDurationByCountry = createRoute(() => ({
  path: `/api/apm/services/{serviceName}/transaction_groups/avg_duration_by_country`,
  params: {
    path: t.type({
      serviceName: t.string
    }),
    query: t.intersection([
      uiFiltersRt,
      rangeRt,
      t.partial({ transactionName: t.string })
    ])
  },
  handler: async ({ context, request }) => {
    const setup = await setupRequest(context, request);
    const { serviceName } = context.params.path;
    const { transactionName } = context.params.query;

    return getTransactionAvgDurationByCountry({
      serviceName,
      transactionName,
      setup
    });
  }
}));
