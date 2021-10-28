/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Maybe } from '../../../common';

export enum RiskScoreFields {
  hostName = 'host_name',
  riskKeyword = 'risk_keyword',
  riskScore = 'risk_score',
}
export interface RiskScoreItem {
  _id?: Maybe<string>;
  [RiskScoreFields.hostName]: Maybe<string>;
  [RiskScoreFields.riskKeyword]: Maybe<string>;
  [RiskScoreFields.riskScore]: Maybe<number>;
}
export enum HostRulesFields {
  hits = 'hits',
  riskScore = 'risk_score',
  ruleName = 'rule_name',
  ruleType = 'rule_type',
}
export interface HostRulesItem {
  _id?: Maybe<string>;
  [HostRulesFields.hits]: Maybe<number>;
  [HostRulesFields.riskScore]: Maybe<number>;
  [HostRulesFields.ruleName]: Maybe<string>;
  [HostRulesFields.ruleType]: Maybe<string>;
}
export enum UserRulesFields {
  userName = 'user_name',
  riskScore = 'risk_score',
  rules = 'rules',
  ruleCount = 'rule_count',
}
export enum HostTacticsFields {
  hits = 'hits',
  riskScore = 'risk_score',
  tactic = 'tactic',
  technique = 'technique',
}
export interface HostTacticsItem {
  _id?: Maybe<string>;
  [HostTacticsFields.hits]: Maybe<number>;
  [HostTacticsFields.riskScore]: Maybe<number>;
  [HostTacticsFields.tactic]: Maybe<string>;
  [HostTacticsFields.technique]: Maybe<string>;
}
