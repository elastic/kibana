/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EcsSecurityExtension } from '@kbn/securitysolution-ecs';
import type { ActionEdges } from '../../../common/search_strategy';

export interface OsqueryActionResultsProps {
  ruleName?: string[];
  ecsData: EcsSecurityExtension;
  actionItems?: ActionEdges;
}
