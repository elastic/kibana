/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as t from 'io-ts';
import { jsonRt } from '../../../common/runtime_types/json_rt';
import { getTransactionErrorRateChartPreview } from '../../lib/alerts/chart_preview/get_transaction_error_rate';
import { setupRequest } from '../../lib/helpers/setup_request';
import { createRoute } from '../create_route';
import { rangeRt } from '../default_api_types';

const alertParamsRt = t.intersection([
  t.type({ threshold: jsonRt.pipe(t.number) }),
  rangeRt,
  t.partial({
    serviceName: t.string,
    environment: t.string,
    transactionType: t.string,
  }),
]);

export type AlertParams = t.TypeOf<typeof alertParamsRt>;

export const transactionErrorRateChartPreview = createRoute({
  endpoint: 'GET /api/apm/alerts/transaction_error_rate/chart_preview',
  params: t.type({ query: alertParamsRt }),
  options: { tags: ['access:apm'] },
  handler: async ({ context, request }) => {
    const setup = await setupRequest(context, request);
    const {
      threshold,
      serviceName,
      environment,
      transactionType,
      start,
      end,
    } = context.params.query;
    return getTransactionErrorRateChartPreview({
      setup,
      alertParams: {
        threshold,
        serviceName,
        environment,
        transactionType,
        start,
        end,
      },
    });
  },
});
