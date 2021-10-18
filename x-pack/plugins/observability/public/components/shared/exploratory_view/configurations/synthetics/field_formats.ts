/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FieldFormat } from '../../types';
import {
  SYNTHETICS_DCL,
  SYNTHETICS_DOCUMENT_ONLOAD,
  SYNTHETICS_FCP,
  SYNTHETICS_LCP,
  SYNTHETICS_STEP_DURATION,
} from '../constants/field_names/synthetics';

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
  {
    field: SYNTHETICS_STEP_DURATION,
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
  {
    field: SYNTHETICS_LCP,
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
  {
    field: SYNTHETICS_FCP,
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
  {
    field: SYNTHETICS_DOCUMENT_ONLOAD,
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
  {
    field: SYNTHETICS_DCL,
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
