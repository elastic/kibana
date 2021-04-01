/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TimelineNonEcsData } from '../../../../../../../common/search_strategy';
import { requiredFields, threatMatchFields } from './fields';

export const isThreatMatchField = (field: TimelineNonEcsData): boolean =>
  threatMatchFields.includes(field.field);

export const isRequiredField = (field: TimelineNonEcsData): boolean =>
  requiredFields.includes(field.field);
