/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EcsSecurityExtension } from '@kbn/securitysolution-ecs';

export interface OsqueryActionResultProps {
  ruleName?: string[];
  ecsData: EcsSecurityExtension;
  actionId: string;
  queryId: string;
  startDate: string;
  canReadOsquery: boolean;
}
