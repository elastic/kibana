/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const ANNOTATION_RESOURCES_VERSION = 1.3;

export const ANNOTATION_INDEX_TEMPLATE_NAME = 'observability-annotations';
export const ANNOTATION_INDEX_TEMPLATE_PATTERN = `observability-annotation*`;

export const ANNOTATION_COMPONENT_TEMPLATE_MAPPINGS_NAME = 'observability-annotations-mappings';
export const ANNOTATION_COMPONENT_TEMPLATE_SETTINGS_NAME = 'observability-annotations-settings';

export const getAnnotationIndexTemplate = (index: string) => ({
  name: ANNOTATION_INDEX_TEMPLATE_NAME,
  index_patterns: [ANNOTATION_INDEX_TEMPLATE_PATTERN, index],
  composed_of: [
    ANNOTATION_COMPONENT_TEMPLATE_MAPPINGS_NAME,
    ANNOTATION_COMPONENT_TEMPLATE_SETTINGS_NAME,
  ],
  priority: 600,
  _meta: {
    description: 'Observability annotation index template',
    version: ANNOTATION_RESOURCES_VERSION,
    managed: true,
    managed_by: 'observability',
  },
});
