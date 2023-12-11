/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RULES_TABLE_MAX_PAGE_SIZE } from '../../../../../common/constants';

export const RULES_TABLE_INITIAL_PAGE_SIZE = 20;
export const RULES_TABLE_PAGE_SIZE_OPTIONS = [5, 10, 20, 50, RULES_TABLE_MAX_PAGE_SIZE];
export const RULES_TABLE_STATE_STORAGE_KEY = 'securitySolution.rulesTable';
