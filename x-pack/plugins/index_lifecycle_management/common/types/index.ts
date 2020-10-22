/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export * from './api';

export * from './policies';

/**
 * These roles reflect how nodes are stratified into different data tiers.
 *
 */
export type NodeDataRole = 'data_hot' | 'data_warm' | 'data_cold';

/**
 * The "data" role can store data on any tier and the "data_content" role can store
 * all data the ES stack uses for feature functionality like security related indices.
 */
export type NodeDataRoleWithCatchAll = 'data' | 'data_content' | NodeDataRole;
