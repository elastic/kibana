/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { technicalRuleFieldMap } from '../../../assets/field_maps/technical_rule_field_map';
import { mappingFromFieldMap } from '../../../mapping_from_field_map';
import { runtimeTypeFromFieldMap } from '../../../field_map/runtime_type_from_fieldmap';
import { Schema } from '../../definition';

export const technicalFieldMap = technicalRuleFieldMap;

export const technicalFieldMappings = mappingFromFieldMap(technicalFieldMap, 'strict');
export const technicalFieldSchema = Schema.create(runtimeTypeFromFieldMap(technicalFieldMap));
