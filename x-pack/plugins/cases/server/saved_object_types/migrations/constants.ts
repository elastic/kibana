/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Before 8.0.0 we had a few types of cases, comments, and other fields that were never actually used, I'm preserving them here for the migrations
 */
export const GENERATED_ALERT = 'generated_alert';
export const COMMENT_ASSOCIATION_TYPE = 'case';
export const CASE_TYPE_INDIVIDUAL = 'individual';
export const SUB_CASE_SAVED_OBJECT = 'cases-sub-case';
