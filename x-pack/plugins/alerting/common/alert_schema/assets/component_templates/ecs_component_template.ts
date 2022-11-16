/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { merge } from 'lodash';
import { mappingFromFieldMap } from '../../mapping_from_field_map';
import { ClusterPutComponentTemplateBody } from '../../types';
import { ecsFieldMap } from '../field_maps/ecs_field_map';
import { technicalRuleFieldMap } from '../field_maps/technical_rule_field_map';

export const ecsComponentTemplate: ClusterPutComponentTemplateBody = {
  template: {
    settings: {
      number_of_shards: 1,
      'index.mapping.total_fields.limit': 1700,
    },
    mappings: merge(
      {},
      mappingFromFieldMap(ecsFieldMap, 'strict'),
      mappingFromFieldMap(technicalRuleFieldMap, 'strict')
    ),
  },
};
