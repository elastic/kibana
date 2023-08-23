/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { z } from 'zod';

import { requestBasicOptionsSchema } from '../../model/request_basic_options';
import { timerange } from '../../model/timerange';

export const networkKpiTlsHandshakes = requestBasicOptionsSchema.extend({
  timerange,
});

export type NetworkKpiTlsHandshakesRequestOptionsInput = z.input<typeof networkKpiTlsHandshakes>;

export type NetworkKpiTlsHandshakesRequestOptions = z.infer<typeof networkKpiTlsHandshakes>;
