/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pickWithPatterns } from '../../../../common/pick_with_patterns';
import {
  TIMESTAMP,
  TAGS,
  EVENT_KIND,
  EVENT_ACTION,
  RULE_UUID,
  RULE_ID,
  RULE_NAME,
  RULE_CATEGORY,
} from '../../../../common/technical_rule_data_field_names';
import { ecsFieldMap } from '../../../assets/field_maps/ecs_field_map';
import { mappingFromFieldMap } from '../../../mapping_from_field_map';
import { runtimeTypeFromFieldMap } from '../../../field_map/runtime_type_from_fieldmap';
import { Schema } from '../../definition';

export const commonEcsFieldMap = {
  ...pickWithPatterns(
    ecsFieldMap,
    TIMESTAMP,
    TAGS,
    EVENT_KIND,
    EVENT_ACTION,
    RULE_UUID,
    RULE_ID,
    RULE_NAME,
    RULE_CATEGORY
  ),
} as const;

export const commonEcsMappings = mappingFromFieldMap(commonEcsFieldMap, 'strict');
export const commonEcsSchema = Schema.create(runtimeTypeFromFieldMap(commonEcsFieldMap));
