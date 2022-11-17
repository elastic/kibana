/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ClusterPutComponentTemplateRequest } from '@elastic/elasticsearch/lib/api/types';
import { mappingFromFieldMap } from '../field_maps/mapping_from_field_map';
import { ecsFieldMap } from '../field_maps/ecs_field_map';

export const ECS_COMPONENT_TEMPLATE_NAME = 'alerts-ecs-component-template';
export const ecsComponentTemplate: ClusterPutComponentTemplateRequest = {
  name: ECS_COMPONENT_TEMPLATE_NAME,
  template: {
    settings: {
      number_of_shards: 1,
      'index.mapping.total_fields.limit': 2000,
    },
    mappings: mappingFromFieldMap(ecsFieldMap, 'strict'),
  },
};
