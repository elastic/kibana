/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  BulkActionEditPayloadIndexPatterns,
  BulkActionEditPayloadRuleActions,
  BulkActionEditPayloadSchedule,
  BulkActionEditPayloadTags,
  BulkActionEditPayloadTimeline,
} from './bulk_actions_route.gen';

/**
 * actions that modify rules attributes
 */
export type BulkActionEditForRuleAttributes =
  | BulkActionEditPayloadTags
  | BulkActionEditPayloadRuleActions
  | BulkActionEditPayloadSchedule;

/**
 * actions that modify rules params
 */
export type BulkActionEditForRuleParams =
  | BulkActionEditPayloadIndexPatterns
  | BulkActionEditPayloadTimeline
  | BulkActionEditPayloadSchedule;
