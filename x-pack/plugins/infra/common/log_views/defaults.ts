/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defaultSourceConfiguration } from '../source_configuration/defaults';
import { LogViewAttributes, LogViewsStaticConfig } from './types';

export const defaultLogViewId = 'default';

export const defaultLogViewAttributes: LogViewAttributes = {
  name: 'Log View',
  description: 'A default log view',
  logIndices: {
    type: 'index_name',
    indexName: 'logs-*,filebeat-*',
  },
  logColumns: [
    {
      timestampColumn: {
        id: '5e7f964a-be8a-40d8-88d2-fbcfbdca0e2f',
      },
    },
    {
      fieldColumn: {
        id: 'eb9777a8-fcd3-420e-ba7d-172fff6da7a2',
        field: 'event.dataset',
      },
    },
    {
      messageColumn: {
        id: 'b645d6da-824b-4723-9a2a-e8cece1645c0',
      },
    },
  ],
};

export const defaultLogViewsStaticConfig: LogViewsStaticConfig = {
  messageFields: defaultSourceConfiguration.fields.message,
};
