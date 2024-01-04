/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RiskScoreKpiRequestOptionsInput } from '../../../../../../../common/api/search_strategy';
import { RiskScoreEntity, RiskQueries } from '../../../../../../../common/search_strategy';

export const mockOptions: RiskScoreKpiRequestOptionsInput = {
  defaultIndex: [
    'apm-*-transaction*',
    'traces-apm*',
    'auditbeat-*',
    'endgame-*',
    'filebeat-*',
    'logs-*',
    'packetbeat-*',
    'winlogbeat-*',
  ],
  factoryQueryType: RiskQueries.kpiRiskScore,
  filterQuery:
    '{"bool":{"must":[],"filter":[{"match_all":{}},{"bool":{"filter":[{"bool":{"should":[{"exists":{"field":"host.name"}}],"minimum_should_match":1}}]}}],"should":[],"must_not":[]}}',
  entity: RiskScoreEntity.host,
};
