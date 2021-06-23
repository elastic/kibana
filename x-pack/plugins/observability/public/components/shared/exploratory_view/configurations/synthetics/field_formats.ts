/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FieldFormat } from '../../types';

export const syntheticsFieldFormats: FieldFormat[] = [
  {
    field: 'monitor.duration.us',
    format: {
      id: 'duration',
      params: {
        inputFormat: 'microseconds',
        outputFormat: 'humanizePrecise',
        outputPrecision: 1,
        showSuffix: true,
        useShortSuffix: true,
      },
    },
  },
];
