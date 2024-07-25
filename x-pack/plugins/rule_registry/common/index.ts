/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
export type { BrowserFields, BrowserField } from '@kbn/alerting-types';
export { parseTechnicalFields, type ParsedTechnicalFields } from './parse_technical_fields';
export type {
  RuleRegistrySearchRequest,
  RuleRegistrySearchResponse,
  RuleRegistrySearchRequestPagination,
  Alert as EcsFieldsResponse,
} from '@kbn/alerting-types';
export { BASE_RAC_ALERTS_API_PATH } from './constants';
