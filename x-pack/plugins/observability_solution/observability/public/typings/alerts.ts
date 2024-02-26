/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ParsedTechnicalFields } from '@kbn/rule-registry-plugin/common';
import { ParsedExperimentalFields } from '@kbn/rule-registry-plugin/common/parse_experimental_fields';

export interface TopAlert<TAdditionalMetaFields extends Record<string, any> = {}> {
  fields: ParsedTechnicalFields & ParsedExperimentalFields & TAdditionalMetaFields;
  start: number;
  lastUpdated: number;
  reason: string;
  link?: string;
  active: boolean;
  hasBasePath?: boolean;
}
