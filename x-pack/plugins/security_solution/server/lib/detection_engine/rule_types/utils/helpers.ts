/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';
import type { ActionVariable, SummarizedAlertsWithAll } from '@kbn/alerting-plugin/common';
import type { Type } from '@kbn/securitysolution-io-ts-alerting-types';
import { parseScheduleDates } from '@kbn/securitysolution-io-ts-utils';
import type { DetectionAlert860 } from '../../../../../common/detection_engine/schemas/alerts/8.6.0';
// eslint-disable-next-line no-restricted-imports
import { getNotificationResultsLink } from '../../rule_actions_legacy';
import type { RuleParams } from '../../rule_schema';

const commonRuleParamsKeys = [
  'id',
  'name',
  'description',
  'false_positives',
  'rule_id',
  'max_signals',
  'risk_score',
  'output_index',
  'references',
  'severity',
  'timeline_id',
  'timeline_title',
  'threat',
  'type',
  'version',
];

const queryRuleParams = ['index', 'filters', 'language', 'query', 'saved_id', 'response_actions'];
const machineLearningRuleParams = ['anomaly_threshold', 'machine_learning_job_id'];
const thresholdRuleParams = ['threshold', ...queryRuleParams];

const getRuleSpecificRuleParamKeys = (ruleType: Type) => {
  switch (ruleType) {
    case 'machine_learning':
      return machineLearningRuleParams;
    case 'threshold':
      return thresholdRuleParams;
    case 'new_terms':
    case 'threat_match':
    case 'query':
    case 'saved_query':
    case 'eql':
      return queryRuleParams;
  }
};

const transformRuleKeysToActionVariables = (
  actionMessageRuleParams: string[]
): ActionVariable[] => {
  return [
    {
      name: 'results_link',
      description: 'context.results_link',
      summaryBuilder: (alerts: SummarizedAlertsWithAll) => {
        // detection alerts are stored as new alerts
        const signals = alerts.new.data as DetectionAlert860[];

        if (signals.length === 0) return;

        // Get rule info from first signal
        const ruleId = signals[0][`kibana.alert.rule.uuid`] as string;
        const ruleParameters = signals[0][`kibana.alert.rule.parameters`] as RuleParams;

        // get the time bounds for this alert array
        const timestampMillis: number[] = signals
          .map((signal: DetectionAlert860) => {
            const parsedTime = parseScheduleDates(signal['@timestamp']);
            if (parsedTime) {
              return parsedTime.valueOf();
            }
            return null;
          })
          .filter((timeInMillis: number | null) => null != timeInMillis)
          .sort() as number[];

        const link = getNotificationResultsLink({
          from: new Date(timestampMillis[0]).toISOString(),
          to: new Date(timestampMillis[timestampMillis.length - 1]).toISOString(),
          id: ruleId,
          kibanaSiemAppUrl: (ruleParameters?.meta as { kibana_siem_app_url?: string } | undefined)
            ?.kibana_siem_app_url,
        });

        return link;
      },
      useWithTripleBracesInTemplates: true,
    },
    {
      name: 'alerts',
      description: 'context.alerts',
      summaryBuilder: (alerts: SummarizedAlertsWithAll) => {
        return alerts.new.data;
      },
    },
    ...actionMessageRuleParams.map((param: string) => {
      const extendedParam = `rule.${param}`;
      return {
        name: extendedParam,
        description: `context.${extendedParam}`,
        summaryBuilder: (alerts: SummarizedAlertsWithAll) => {
          // detection alerts are stored as new alerts
          const signals = alerts.new.data as DetectionAlert860[];

          if (signals.length === 0) return;

          // Get rule info from first signal
          const ruleParameters = signals[0][`kibana.alert.rule.parameters`] as RuleParams;
          const val = get(ruleParameters, param);
          return val;
        },
      };
    }),
  ];
};

export const getActionMessageRuleParams = (ruleType: Type): string[] => {
  const ruleParamsKeys = [
    ...commonRuleParamsKeys,
    ...getRuleSpecificRuleParamKeys(ruleType),
  ].sort();

  return ruleParamsKeys;
};

export const getActionContext = (ruleType: Type | undefined): ActionVariable[] => {
  if (!ruleType) {
    return [];
  }
  const actionMessageRuleParams = getActionMessageRuleParams(ruleType);

  return transformRuleKeysToActionVariables(actionMessageRuleParams);
};
