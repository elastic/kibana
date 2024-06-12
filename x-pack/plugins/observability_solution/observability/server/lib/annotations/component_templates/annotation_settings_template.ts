/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ANNOTATION_COMPONENT_TEMPLATE_SETTINGS_NAME,
  ANNOTATION_RESOURCES_VERSION,
} from '../index_templates/annotation_index_templates';

export const getAnnotationSettingsTemplate = () => ({
  name: ANNOTATION_COMPONENT_TEMPLATE_SETTINGS_NAME,
  template: {
    settings: {
      auto_expand_replicas: '0-1',
      hidden: false,
    },
  },
  _meta: {
    description: 'Annotation settings template',
    version: ANNOTATION_RESOURCES_VERSION,
    managed: true,
    managed_by: 'observability',
  },
});
