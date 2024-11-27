/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SamplesFormat } from '../../../common';

export const EX_ANSWER_LOG_TYPE: SamplesFormat = {
  name: 'csv',
  header: false,
  columns: ['ip', 'timestamp', 'request', 'status', '', 'bytes'],
};
