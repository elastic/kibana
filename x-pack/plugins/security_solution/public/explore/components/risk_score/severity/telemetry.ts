/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RiskScoreEntity, RiskSeverity } from '../../../../../common/search_strategy';
import type { SecurityPageName } from '../../../../app/types';

export const ENTITY_RISK_FILTERED = (
  page: SecurityPageName,
  entity: RiskScoreEntity,
  classification: RiskSeverity
) => `${entity}_risk_filter_${classification}_${page}`;
