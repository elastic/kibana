/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RiskScoreEntity } from '../../../../../common/search_strategy';
import type { SecurityPageName } from '../../../../app/types';

export const ENTITY_RISK_INVESTIGATE_ALERTS = (page: SecurityPageName, entity: RiskScoreEntity) =>
  `${entity}_risk_investigate_alerts_${page}`;
