/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';
import { transactionSampleRateRt } from '../transaction_sample_rate_rt';
import { transactionMaxSpansRt } from '../transaction_max_spans_rt';

export const serviceRt = t.partial({
  name: t.string,
  environment: t.string
});

export const agentConfigurationIntakeRt = t.intersection([
  t.partial({ agent_name: t.string }),
  t.type({
    service: serviceRt,
    settings: t.partial({
      transaction_sample_rate: transactionSampleRateRt,
      capture_body: t.string,
      transaction_max_spans: transactionMaxSpansRt
    })
  })
]);
