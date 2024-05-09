/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { euiLightVars } from '@kbn/ui-theme';
import { RiskSeverity } from '../../../common/search_strategy';
import { SEVERITY_COLOR } from '../../overview/components/detection_response/utils';
export { RISK_LEVEL_RANGES as RISK_SCORE_RANGES } from '../../../common/entity_analytics/risk_engine';

export const SEVERITY_UI_SORT_ORDER = [
  RiskSeverity.unknown,
  RiskSeverity.low,
  RiskSeverity.moderate,
  RiskSeverity.high,
  RiskSeverity.critical,
];

export const RISK_SEVERITY_COLOUR: { [k in RiskSeverity]: string } = {
  [RiskSeverity.unknown]: euiLightVars.euiColorMediumShade,
  [RiskSeverity.low]: SEVERITY_COLOR.low,
  [RiskSeverity.moderate]: SEVERITY_COLOR.medium,
  [RiskSeverity.high]: SEVERITY_COLOR.high,
  [RiskSeverity.critical]: SEVERITY_COLOR.critical,
};

type SnakeToCamelCaseString<S extends string> = S extends `${infer T}_${infer U}`
  ? `${T}${Capitalize<SnakeToCamelCaseString<U>>}`
  : S;

type SnakeToCamelCaseArray<T> = T extends Array<infer ArrayItem>
  ? Array<SnakeToCamelCase<ArrayItem>>
  : T;

// TODO #173073 @tiansivive Add to utilities in `packages/kbn-utility-types`
export type SnakeToCamelCase<T> = T extends Record<string, unknown>
  ? {
      [K in keyof T as SnakeToCamelCaseString<K & string>]: SnakeToCamelCase<T[K]>;
    }
  : T extends unknown[]
  ? SnakeToCamelCaseArray<T>
  : T;

export enum UserRiskScoreQueryId {
  USERS_BY_RISK = 'UsersByRisk',
  USER_DETAILS_RISK_SCORE = 'UserDetailsRiskScore',
}

export enum HostRiskScoreQueryId {
  DEFAULT = 'HostRiskScore',
  HOST_DETAILS_RISK_SCORE = 'HostDetailsRiskScore',
  OVERVIEW_RISKY_HOSTS = 'OverviewRiskyHosts',
  HOSTS_BY_RISK = 'HostsByRisk',
}

/**
 *
 * @returns risk score rounded with 2 digits after the decimal separator
 * @example
 * formatRiskScore(10.555) // '10.56'
 */
export const formatRiskScore = (riskScore: number) =>
  (Math.round(riskScore * 100) / 100).toFixed(2);

export const FIRST_RECORD_PAGINATION = {
  cursorStart: 0,
  querySize: 1,
};
