/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RuntimeField } from '@kbn/data-views-plugin/public';
import { MS_TO_HUMANIZE_PRECISE } from './field_formats';
import {
  SYNTHETICS_DNS_TIMINGS,
  SYNTHETICS_BLOCKED_TIMINGS,
  SYNTHETICS_CONNECT_TIMINGS,
  SYNTHETICS_TOTAL_TIMINGS,
  SYNTHETICS_RECEIVE_TIMINGS,
  SYNTHETICS_SEND_TIMINGS,
  SYNTHETICS_WAIT_TIMINGS,
  SYNTHETICS_SSL_TIMINGS,
} from '../constants/field_names/synthetics';

const LONG_FIELD = {
  type: 'long' as const,
  format: {
    id: 'duration',
    params: MS_TO_HUMANIZE_PRECISE,
  },
};

export const syntheticsRuntimeFields: Array<{ name: string; field: RuntimeField }> = [
  {
    name: SYNTHETICS_DNS_TIMINGS,
    field: LONG_FIELD,
  },
  {
    name: SYNTHETICS_BLOCKED_TIMINGS,
    field: LONG_FIELD,
  },
  {
    name: SYNTHETICS_CONNECT_TIMINGS,
    field: LONG_FIELD,
  },
  {
    name: SYNTHETICS_TOTAL_TIMINGS,
    field: LONG_FIELD,
  },
  {
    name: SYNTHETICS_RECEIVE_TIMINGS,
    field: LONG_FIELD,
  },
  {
    name: SYNTHETICS_SEND_TIMINGS,
    field: LONG_FIELD,
  },
  {
    name: SYNTHETICS_WAIT_TIMINGS,
    field: LONG_FIELD,
  },
  {
    name: SYNTHETICS_SSL_TIMINGS,
    field: LONG_FIELD,
  },
];
