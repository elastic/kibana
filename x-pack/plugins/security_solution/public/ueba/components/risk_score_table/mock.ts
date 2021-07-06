/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RiskScoreEdges } from '../../../../common/search_strategy/security_solution/ueba';

export const mockData: RiskScoreEdges[] = [
  {
    node: {
      _id: 'beats-ci-immutable-ubuntu-1804-1615475026535098510',
      risk_score: 73.0,
      risk_keyword: 'High',
      host_name: 'Dr Evil',
    },
    cursor: { value: 'beats-ci-immutable-ubuntu-1804-1615475026535098510', tiebreaker: null },
  },
];
