/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BrowserFields } from '@kbn/timelines-plugin/common';

/**
 * Mock the browserFields object
 */
export const mockBrowserFields: BrowserFields = {
  kibana: {
    fields: {
      'kibana.alert.workflow_status': {
        aggregatable: true,
        esTypes: ['0'],
        format: '',
        name: 'kibana.alert.workflow_status',
        readFromDocValues: true,
        searchable: true,
        type: 'string',
      },
    },
  },
};
