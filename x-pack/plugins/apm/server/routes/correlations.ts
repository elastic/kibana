/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from '@hapi/boom';
import { i18n } from '@kbn/i18n';
import * as t from 'io-ts';
import { isActivePlatinumLicense } from '../../common/license_check';
import { getCorrelationsForFailedTransactions } from '../lib/correlations/get_correlations_for_failed_transactions';
import { getCorrelationsForSlowTransactions } from '../lib/correlations/get_correlations_for_slow_transactions';
import { setupRequest } from '../lib/helpers/setup_request';
import { createRoute } from './create_route';
import { rangeRt } from './default_api_types';

const INVALID_LICENSE = i18n.translate(
  'xpack.apm.significanTerms.license.text',
  {
    defaultMessage:
      'To use the correlations API, you must be subscribed to an Elastic Platinum license.',
  }
);

export const correlationsForSlowTransactionsRoute = createRoute({
  endpoint: 'GET /api/apm/correlations/slow_transactions',
  params: t.type({
    query: t.intersection([
      t.partial({
        serviceName: t.string,
        transactionName: t.string,
        transactionType: t.string,
      }),
      t.type({
        durationPercentile: t.string,
        fieldNames: t.string,
      }),
      t.partial({ uiFilters: t.string }),
      rangeRt,
    ]),
  }),
  options: { tags: ['access:apm'] },
  handler: async ({ context, request }) => {
    if (!isActivePlatinumLicense(context.licensing.license)) {
      throw Boom.forbidden(INVALID_LICENSE);
    }
    const setup = await setupRequest(context, request);
    const {
      serviceName,
      transactionType,
      transactionName,
      durationPercentile,
      fieldNames,
    } = context.params.query;

    return getCorrelationsForSlowTransactions({
      serviceName,
      transactionType,
      transactionName,
      durationPercentile: parseInt(durationPercentile, 10),
      fieldNames: fieldNames.split(','),
      setup,
    });
  },
});

export const correlationsForFailedTransactionsRoute = createRoute({
  endpoint: 'GET /api/apm/correlations/failed_transactions',
  params: t.type({
    query: t.intersection([
      t.partial({
        serviceName: t.string,
        transactionName: t.string,
        transactionType: t.string,
      }),
      t.type({
        fieldNames: t.string,
      }),
      t.partial({ uiFilters: t.string }),
      rangeRt,
    ]),
  }),
  options: { tags: ['access:apm'] },
  handler: async ({ context, request }) => {
    if (!isActivePlatinumLicense(context.licensing.license)) {
      throw Boom.forbidden(INVALID_LICENSE);
    }
    const setup = await setupRequest(context, request);
    const {
      serviceName,
      transactionType,
      transactionName,

      fieldNames,
    } = context.params.query;

    return getCorrelationsForFailedTransactions({
      serviceName,
      transactionType,
      transactionName,
      fieldNames: fieldNames.split(','),
      setup,
    });
  },
});
