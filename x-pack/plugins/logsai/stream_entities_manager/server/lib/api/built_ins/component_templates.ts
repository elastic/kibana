/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ApiScraperDefinition } from '../../../../common/types';

export const componentTemplates: ApiScraperDefinition = {
  id: 'component_templates',
  name: 'Component templates in Elasticsearch',
  identityFields: ['name'],
  metrics: [],
  metadata: [
    {
      source: 'component_template.template.settings',
      destination: 'template.settings',
      fromRoot: false,
    },
    {
      source: 'component_template._meta',
      destination: '_meta',
      fromRoot: false,
    },
  ],
  source: {
    type: 'elasticsearch_api',
    endpoint: '_component_template',
    method: 'GET',
    params: {
      body: {},
      query: {},
    },
    collect: {
      path: 'component_templates',
      keyed: true,
    },
  },
  managed: true,
};
