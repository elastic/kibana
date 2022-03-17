/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export {
  BASE_ALERTING_API_PATH,
  INTERNAL_BASE_ALERTING_API_PATH,
} from '../../../../alerting/common';
export { BASE_ACTION_API_PATH, INTERNAL_BASE_ACTION_API_PATH } from '../../../../actions/common';

export type Section = 'connectors' | 'rules';

export const routeToHome = `/`;
export const routeToConnectors = `/connectors`;
export const routeToRules = `/rules`;
export const routeToRuleDetails = `/rule/:ruleId`;
export const legacyRouteToRules = `/alerts`;
export const legacyRouteToRuleDetails = `/alert/:alertId`;

export const recoveredActionGroupMessage = i18n.translate(
  'xpack.triggersActionsUI.sections.actionForm.RecoveredMessage',
  {
    defaultMessage: 'Recovered',
  }
);

export { TIME_UNITS } from './time_units';
export enum SORT_ORDERS {
  ASCENDING = 'asc',
  DESCENDING = 'desc',
}

export const DEFAULT_SEARCH_PAGE_SIZE: number = 10;

export const DEFAULT_RULE_INTERVAL = '1m';
