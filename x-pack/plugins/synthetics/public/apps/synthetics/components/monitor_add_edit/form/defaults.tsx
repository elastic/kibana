/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_FIELDS } from '../constants';
import { DataStream } from '../types';

export const DEFAULT_FORM_FIELDS = {
  [DataStream.BROWSER]: {
    ...DEFAULT_FIELDS[DataStream.BROWSER],
    'source.inline': {
      type: 'recorder',
      script: '',
      fileName: '',
    },
    isTLSEnabled: false,
  },
  [DataStream.HTTP]: {
    ...DEFAULT_FIELDS[DataStream.HTTP],
    isTLSEnabled: false,
  },
  [DataStream.TCP]: {
    ...DEFAULT_FIELDS[DataStream.TCP],
    isTLSEnabled: false,
  },
  [DataStream.ICMP]: {
    ...DEFAULT_FIELDS[DataStream.ICMP],
    isTLSEnabled: false,
  },
};
