/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FieldFormat } from '../../types';
import {
  FCP_FIELD,
  FID_FIELD,
  LCP_FIELD,
  TBT_FIELD,
  TRANSACTION_DURATION,
} from '../data/elasticsearch_fieldnames';

export const rumFieldFormats: FieldFormat[] = [
  {
    field: TRANSACTION_DURATION,
    format: {
      id: 'duration',
      params: {
        inputFormat: 'microseconds',
        outputFormat: 'asSeconds',
      },
    },
  },
  {
    field: FCP_FIELD,
    format: {
      id: 'duration',
      params: {
        inputFormat: 'milliseconds',
        outputFormat: 'asSeconds',
      },
    },
  },
  {
    field: LCP_FIELD,
    format: {
      id: 'duration',
      params: {
        inputFormat: 'milliseconds',
        outputFormat: 'asSeconds',
      },
    },
  },
  {
    field: TBT_FIELD,
    format: {
      id: 'duration',
      params: {
        inputFormat: 'milliseconds',
        outputFormat: 'asMilliseconds',
      },
    },
  },
  {
    field: FID_FIELD,
    format: {
      id: 'duration',
      params: {
        inputFormat: 'milliseconds',
        outputFormat: 'asMilliseconds',
      },
    },
  },
];
