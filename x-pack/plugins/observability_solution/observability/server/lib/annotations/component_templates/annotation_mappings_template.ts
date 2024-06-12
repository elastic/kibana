/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ClusterPutComponentTemplateRequest } from '@elastic/elasticsearch/lib/api/types';
import { Mappings } from '../../../utils/create_or_update_index';
import {
  ANNOTATION_COMPONENT_TEMPLATE_MAPPINGS_NAME,
  ANNOTATION_RESOURCES_VERSION,
} from '../index_templates/annotation_index_templates';

export const ANNOTATION_MAPPINGS: Mappings = {
  dynamic: true,
  properties: {
    annotation: {
      properties: {
        type: {
          type: 'keyword',
        },
      },
    },
    message: {
      type: 'keyword',
    },
    tags: {
      type: 'keyword',
    },
    '@timestamp': {
      type: 'date',
    },
    '@timestampEnd': {
      type: 'date',
    },
    event: {
      properties: {
        created: {
          type: 'date',
        },
      },
    },
    service: {
      properties: {
        name: {
          type: 'keyword',
        },
        environment: {
          type: 'keyword',
        },
        version: {
          type: 'keyword',
        },
      },
    },
    slo: {
      properties: {
        id: {
          type: 'keyword',
        },
      },
    },
  },
};

export const getAnnotationMappingsTemplate = (): ClusterPutComponentTemplateRequest => ({
  name: ANNOTATION_COMPONENT_TEMPLATE_MAPPINGS_NAME,
  template: {
    mappings: ANNOTATION_MAPPINGS,
  },
  _meta: {
    description: 'SLO summary mappings template',
    version: ANNOTATION_RESOURCES_VERSION,
    managed: true,
    managed_by: 'observability',
  },
});
