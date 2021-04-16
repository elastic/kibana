/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FieldFormat } from '../../types';
import { TRANSACTION_DURATION } from '../constants/elasticsearch_fieldnames';

export const apmFieldFormats: FieldFormat[] = [
  {
    field: TRANSACTION_DURATION,
    format: {
      id: 'duration',
      params: {
        inputFormat: 'microseconds',
        outputFormat: 'asMilliseconds',
        outputPrecision: 0,
        showSuffix: true,
      },
    },
  },
];
