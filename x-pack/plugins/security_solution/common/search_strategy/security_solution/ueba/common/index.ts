/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Maybe } from '../../../common';

export enum RiskScoreFields {
  hostName = 'hostName',
  riskScore = 'riskScore',
  riskKeyword = 'riskKeyword',
}
export interface RiskScoreItem {
  _id?: Maybe<string>;
  host_name: string;
  risk_score: number;
  risk_keyword: string;
}
