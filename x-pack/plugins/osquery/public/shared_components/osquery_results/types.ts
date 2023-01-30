/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Ecs } from '../../../common/ecs';
import type { ActionEdges } from '../../../common/search_strategy';

export interface OsqueryActionResultsCommonProps {
  agentIds?: string[];
  ruleName?: string[];
  ecsData: Ecs | null;
}

// TODO FIX types, these 2 below should have more strict (required) types and then use proper guard + casting
export type OsqueryActionResultsWithItems = OsqueryActionResultsCommonProps & {
  actionItems?: ActionEdges;
};

export type OsqueryActionResultsWithIds = OsqueryActionResultsCommonProps & {
  alertId?: string;
  actionId?: string;
};

export type OsqueryActionResultsProps = OsqueryActionResultsWithItems & OsqueryActionResultsWithIds;
