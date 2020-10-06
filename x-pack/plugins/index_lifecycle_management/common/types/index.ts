/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export * from './api';

export * from './policies';

/**
 * These roles reflect how nodes are stratified into different data tiers. The "data" role
 * is a catch-all that can be used to store data in any phase.
 */
export type NodeDataRole = 'data_hot' | 'data_warm' | 'data_cold';
export type NodeDataRoleWithCatchAll = 'data' | NodeDataRole;
