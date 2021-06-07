/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { merge } from 'lodash';
import { ClusterPutComponentTemplateBody } from '../../../../../rule_registry/common/types';
import { mappingFromFieldMap } from '../../../../../rule_registry/common/mapping_from_field_map';
import { ctiFieldMap } from './cti_field_map';
import { securityFieldMap } from './security_field_map';

export const securityComponentTemplate: ClusterPutComponentTemplateBody = {
  template: {
    settings: {
      number_of_shards: 1,
    },
    mappings: merge({}, mappingFromFieldMap(ctiFieldMap), mappingFromFieldMap(securityFieldMap)),
  },
};
