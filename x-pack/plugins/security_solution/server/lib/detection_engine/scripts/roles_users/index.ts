/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export * from './detections_admin';
export * from './hunter';
export * from './platform_engineer';
export * from './reader';
export * from './rule_author';
export * from './soc_manager';
export * from './t1_analyst';
export * from './t2_analyst';

// TODO: Steph/sourcerer remove from detections_role.json once we have our internal saved object client
// https://github.com/elastic/security-team/issues/1978
// "indexPatterns": ["read"],
// "savedObjectsManagement": ["read"],
