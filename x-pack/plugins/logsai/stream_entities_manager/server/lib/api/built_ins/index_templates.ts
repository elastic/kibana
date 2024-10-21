/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ApiScraperDefinition } from '../../../../common/types';

export const indexTemplates: ApiScraperDefinition = {
  id: 'index_templates',
  name: 'Index templates in Elasticsearch',
  identityFields: ['name'],
  metrics: [],
  metadata: [
    {
      source: 'index_template.index_patterns',
      destination: 'index_patterns',
      fromRoot: false,
    },
    {
      source: 'index_template.composed_of',
      destination: 'composed_of',
      fromRoot: false,
    },
    {
      source: 'index_template.priority',
      destination: 'priority',
      fromRoot: false,
    },
    {
      source: 'index_template.data_stream',
      destination: 'data_stream',
      fromRoot: false,
    },
    {
      source: 'index_template.allow_auto_create',
      destination: 'allow_auto_create',
      fromRoot: false,
    },
    {
      source: 'index_template._meta',
      destination: '_meta',
      fromRoot: false,
    },

    {
      source: 'index_template.template.settings',
      destination: 'template.settings',
      fromRoot: false,
    },
    {
      source: 'index_template.ignore_missing_component_templates',
      destination: 'ignore_missing_component_templates',
      fromRoot: false,
    },
  ],
  source: {
    type: 'elasticsearch_api',
    endpoint: '_index_template',
    method: 'GET',
    params: {
      body: {},
      query: {},
    },
    collect: {
      path: 'index_templates',
      keyed: false,
    },
  },
  managed: true,
};
