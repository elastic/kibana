/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setStateToKbnUrl } from '@kbn/kibana-utils-plugin/common';
import type { SerializableRecord } from '@kbn/utility-types';
import type { LocatorDefinition } from '@kbn/share-plugin/public';
import { AlertStatus } from '../../types';
import { OBSERVABILITY_APP_BASE_PATH } from '../../constants';

export const RULE_DETAILS_EXECUTION_TAB = 'execution';
export const RULE_DETAILS_ALERTS_TAB = 'alerts';

export const RULE_DETAILS_SEARCH_BAR_URL_STORAGE_KEY = 'searchBarParams';

export const ruleDetailsLocatorID = 'RULE_DETAILS_LOCATOR';
type TabId = typeof RULE_DETAILS_ALERTS_TAB | typeof RULE_DETAILS_EXECUTION_TAB;

export const RULES_PATH = `${OBSERVABILITY_APP_BASE_PATH}/alerts/rules`;

export interface RuleDetailsLocatorParams extends SerializableRecord {
  ruleId: string;
  tabId?: TabId;
  rangeFrom?: string;
  rangeTo?: string;
  kuery?: string;
  status?: AlertStatus;
}

export const getRuleDetailsPath = (ruleId: string) => {
  return `${RULES_PATH}/${encodeURI(ruleId)}`;
};

export class ObservabilityRuleDetailsLocator
  implements LocatorDefinition<RuleDetailsLocatorParams>
{
  public readonly id = ruleDetailsLocatorID;

  public readonly getLocation = async (params: RuleDetailsLocatorParams) => {
    const { ruleId, kuery, rangeTo, tabId, rangeFrom, status } = params;
    const appState: {
      tabId?: TabId;
      rangeFrom?: string;
      rangeTo?: string;
      kuery?: string;
      status?: AlertStatus;
    } = {};

    appState.rangeFrom = rangeFrom || 'now-15m';
    appState.rangeTo = rangeTo || 'now';
    appState.kuery = kuery || '';
    appState.status = status || 'all';

    let path = getRuleDetailsPath(ruleId);

    if (tabId === RULE_DETAILS_ALERTS_TAB) {
      path = `${path}?tabId=${tabId}`;
      path = setStateToKbnUrl(
        RULE_DETAILS_SEARCH_BAR_URL_STORAGE_KEY,
        appState,
        { useHash: false, storeInHashQuery: false },
        path
      );
    } else if (tabId === RULE_DETAILS_EXECUTION_TAB) {
      path = `${path}?tabId=${tabId}`;
    }

    return {
      app: 'observability',
      path,
      state: {},
    };
  };
}
