/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityType } from '../../../../../common/api/entity_analytics/entity_store/common.gen';

interface BaseFieldRetentionOperator {
  field: string;
  operation: string;
}

// A field retention operator that always keeps the oldest value of the field. e.g first_seen_timestamp
export interface PreferNewestValue extends BaseFieldRetentionOperator {
  operation: 'prefer_newest_value';
}

export interface PreferOldestValue extends BaseFieldRetentionOperator {
  operation: 'prefer_oldest_value';
}

// A field retention operator that collects up to `maxLength` values of the field. e.g collect up to 10 values of ip_address
export interface CollectValues extends BaseFieldRetentionOperator {
  operation: 'collect_values';
  maxLength: number;
}

export type FieldRetentionOperator = PreferNewestValue | PreferOldestValue | CollectValues;

export interface FieldRetentionDefinition {
  version: number;
  entityType: EntityType;
  matchField: string;
  fields: FieldRetentionOperator[];
}
