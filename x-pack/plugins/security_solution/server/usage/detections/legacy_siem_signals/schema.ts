/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MakeSchemaFrom } from '@kbn/usage-collection-plugin/server';
import type { LegacySiemSignals } from './types';

export const legacySiemSignalsSchema: MakeSchemaFrom<LegacySiemSignals> = {
  indices_total: {
    type: 'long',
    _meta: {
      description: 'Total number of legacy siem signals indices',
    },
  },
  spaces_total: {
    type: 'long',
    _meta: {
      description: 'Total number of Kibana spaces that have legacy siem signals indices',
    },
  },
};
