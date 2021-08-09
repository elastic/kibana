/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AlertInstanceState } from '../../../common/types/alerts';
import { RulesClient } from '../../../../alerting/server';
import { AlertsFactory } from '../../alerts';
import { CommonAlertState, CommonAlertFilter, RulesByType } from '../../../common/types/alerts';
import { ALERTS } from '../../../common/constants';

export async function fetchStatus(
  rulesClient: RulesClient,
  alertTypes: string[] | undefined,
  clusterUuids: string[],
  filters: CommonAlertFilter[] = []
): Promise<RulesByType> {
  const rulesByType = await Promise.all(
    (alertTypes || ALERTS).map(async (type) => AlertsFactory.getByType(type, rulesClient))
  );
  if (!rulesByType.length) return {};

  const rulesFlattened = rulesByType.flat();
  const rulesWithStates = await Promise.all(
    rulesFlattened.map(async (rule) => {
      // we should have a different class to distinguish between "alerts" where the rule exists
      // and a BaseAlert created without an existing rule for better typing so we don't need to check here
      if (!rule.rawAlert) {
        throw new Error('alert missing rawAlert');
      }
      const id = rule.getId();
      if (!id) {
        throw new Error('alert missing id');
      }

      // Now that we have the id, we can get the state
      const states = await rule.getStates(rulesClient, id, filters);
      // puts all alert states associated with this rule into a flat array.  this works with both the legacy alert
      // of having multiple alert states per alert, each representing a firing node, and the current alert where each firing
      // node is an alert with a single alert state, the node itself. https://github.com/elastic/kibana/pull/102544
      const alertStates = Object.values(states).reduce(
        (accum: CommonAlertState[], instance: any) => {
          const alertInstanceState = instance.state as AlertInstanceState;
          if (!alertInstanceState.alertStates) {
            return accum;
          }
          for (const state of alertInstanceState.alertStates) {
            const meta = instance.meta;
            if (clusterUuids && !clusterUuids.includes(state.cluster.clusterUuid)) {
              return accum;
            }

            let firing = false;
            if (state.ui.isFiring) {
              firing = true;
            }
            accum.push({ firing, state, meta });
          }
          return accum;
        },
        []
      );

      const type = rule.alertOptions.id;
      const result = {
        states: alertStates,
        rawAlert: rule.rawAlert,
      };
      return { type, result };
    })
  );
  rulesWithStates.sort((a, b) => (a.type === b.type ? 0 : a.type.length > b.type.length ? 1 : -1));
  return rulesWithStates.reduce<RulesByType>((acc, { type, result }) => {
    acc[type] = acc[type] ? [...acc[type], result] : [result];
    return acc;
  }, {});
}
