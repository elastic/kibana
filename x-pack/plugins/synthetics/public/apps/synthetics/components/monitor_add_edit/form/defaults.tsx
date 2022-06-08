/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_FIELDS } from '../constants';
import { DataStream, FormMonitorType } from '../types';

export const DEFAULT_FORM_FIELDS: Record<FormMonitorType, Record<string, any>> = {
  [FormMonitorType.MULTISTEP]: {
    ...DEFAULT_FIELDS[DataStream.BROWSER],
    'source.inline': {
      type: 'recorder',
      script: '',
      fileName: '',
    },
    formMonitorType: FormMonitorType.MULTISTEP,
  },
  [FormMonitorType.SINGLE]: {
    ...DEFAULT_FIELDS[DataStream.BROWSER],
    formMonitorType: FormMonitorType.SINGLE,
  },
  [FormMonitorType.HTTP]: {
    ...DEFAULT_FIELDS[DataStream.HTTP],
    isTLSEnabled: false,
    formMonitorType: FormMonitorType.HTTP,
  },
  [FormMonitorType.TCP]: {
    ...DEFAULT_FIELDS[DataStream.TCP],
    isTLSEnabled: false,
    formMonitorType: FormMonitorType.TCP,
  },
  [FormMonitorType.ICMP]: {
    ...DEFAULT_FIELDS[DataStream.ICMP],
    formMonitorType: FormMonitorType.ICMP,
  },
};
