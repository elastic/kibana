/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as t from 'io-ts';
import {
  severity,
  severity_mapping,
  severity_mapping_item,
} from '@kbn/securitysolution-io-ts-alerting-types';

/**
 * TODO: https://github.com/elastic/kibana/pull/142950 Add description
 */
export type Severity = t.TypeOf<typeof Severity>;
export const Severity = severity;

/**
 * TODO: https://github.com/elastic/kibana/pull/142950 Add description
 */
export type SeverityMapping = t.TypeOf<typeof SeverityMapping>;
export const SeverityMapping = severity_mapping;

/**
 * TODO: https://github.com/elastic/kibana/pull/142950 Add description
 */
export type SeverityMappingItem = t.TypeOf<typeof SeverityMappingItem>;
export const SeverityMappingItem = severity_mapping_item;
