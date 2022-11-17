/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ClusterPutComponentTemplateRequest } from '@elastic/elasticsearch/lib/api/types';
import { mappingFromFieldMap } from '../field_maps/mapping_from_field_map';
import { alertFieldMap } from '../field_maps/alert_field_map';

export const ALERTS_COMPONENT_TEMPLATE_NAME = 'alerts-default-component-template';
export const alertsComponentTemplate: ClusterPutComponentTemplateRequest = {
  name: ALERTS_COMPONENT_TEMPLATE_NAME,
  template: {
    settings: {
      number_of_shards: 1,
      'index.mapping.total_fields.limit': 100,
    },
    mappings: mappingFromFieldMap(alertFieldMap, 'strict'),
  },
};
