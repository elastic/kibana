/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mappingFromFieldMap } from '../../mapping_from_field_map';
import { ClusterPutComponentTemplateBody } from '../../types';
import { experimentalRuleFieldMap } from '../field_maps/experimental_rule_field_map';

export const experimentalComponentTemplate: ClusterPutComponentTemplateBody = {
  template: {
    settings: {
      number_of_shards: 1,
    },
    mappings: mappingFromFieldMap(experimentalRuleFieldMap, 'strict'),
  },
};
