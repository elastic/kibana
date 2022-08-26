/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SLO_COMPONENT_TEMPLATE_MAPPINGS_NAME,
  SLO_COMPONENT_TEMPLATE_SETTINGS_NAME,
  SLO_INDEX_TEMPLATE_NAME,
} from '../common';

export const sloIndexTemplate = {
  index_patterns: [`${SLO_INDEX_TEMPLATE_NAME}-*`],
  composed_of: [SLO_COMPONENT_TEMPLATE_MAPPINGS_NAME, SLO_COMPONENT_TEMPLATE_SETTINGS_NAME],
  priority: 500,
  _meta: {
    description: 'Template for SLO rollup data',
  },
};
