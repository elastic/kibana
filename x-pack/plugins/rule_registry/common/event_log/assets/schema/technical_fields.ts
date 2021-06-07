/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ALERT_DURATION,
  ALERT_END,
  ALERT_EVALUATION_THRESHOLD,
  ALERT_EVALUATION_VALUE,
  ALERT_ID,
  ALERT_SEVERITY_LEVEL,
  ALERT_SEVERITY_VALUE,
  ALERT_START,
  ALERT_STATUS,
  ALERT_UUID,
  PRODUCER,
} from '../../../../common/technical_rule_data_field_names';
import { mappingFromFieldMap } from '../../../mapping_from_field_map';
import { runtimeTypeFromFieldMap } from '../../../field_map/runtime_type_from_fieldmap';
import { Schema } from '../../definition';

export const technicalFieldMap = {
  [PRODUCER]: { type: 'keyword' },
  [ALERT_UUID]: { type: 'keyword' },
  [ALERT_ID]: { type: 'keyword' },
  [ALERT_START]: { type: 'date' },
  [ALERT_END]: { type: 'date' },
  [ALERT_DURATION]: { type: 'long' },
  [ALERT_SEVERITY_LEVEL]: { type: 'keyword' },
  [ALERT_SEVERITY_VALUE]: { type: 'long' },
  [ALERT_STATUS]: { type: 'keyword' },
  [ALERT_EVALUATION_THRESHOLD]: { type: 'scaled_float', scaling_factor: 100 },
  [ALERT_EVALUATION_VALUE]: { type: 'scaled_float', scaling_factor: 100 },
} as const;

export const technicalFieldMappings = mappingFromFieldMap(technicalFieldMap);
export const technicalFieldSchema = Schema.create(runtimeTypeFromFieldMap(technicalFieldMap));
