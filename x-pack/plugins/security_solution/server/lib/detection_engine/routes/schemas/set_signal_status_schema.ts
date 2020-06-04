/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';

/* eslint-disable @typescript-eslint/camelcase */
import { signal_ids, signal_status_query, status } from './schemas';
/* eslint-enable @typescript-eslint/camelcase */

export const setSignalsStatusSchema = Joi.object({
  signal_ids,
  query: signal_status_query,
  status: status.required(),
}).xor('signal_ids', 'query');
