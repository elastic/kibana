/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryRuleCreateProps } from '../../../../../common/api/detection_engine';

export const buildBasicQueryRule: () => QueryRuleCreateProps = () => ({
  type: 'query',
  query: '*:*',
  name: 'Sample Query Rule',
  description: 'Sample Query Rule',
  severity: 'low',
  risk_score: 21,
});
