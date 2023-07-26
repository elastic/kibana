/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { CoreSetup } from '@kbn/core/server';
import { extractReferences, injectReferences } from '@kbn/data-plugin/common';
import { IRuleTypeAlerts } from '@kbn/alerting-plugin/server';
import {
  ALERT_CONDITIONS,
  ALERT_CONDITIONS_MET_VALUE,
  ALERT_DATE,
  ALERT_HITS_COUNT,
  ALERT_HITS_HITS,
  ALERT_MESSAGE,
  ALERT_RULE_LINK,
  ALERT_RULE_NAME,
  ALERT_STATE_DATE_END,
  ALERT_STATE_DATE_START,
  ALERT_STATE_LAST_TIMESTAMP,
  ALERT_TITLE,
} from '@kbn/rule-data-utils';
import { RuleAlertData } from '@kbn/alerting-plugin/common';
import { RuleType } from '../../types';
import { ActionContext } from './action_context';
import {
  EsQueryRuleParams,
  EsQueryRuleParamsExtractedParams,
  EsQueryRuleParamsSchema,
  EsQueryRuleState,
} from './rule_type_params';
import { STACK_ALERTS_FEATURE_ID } from '../../../common';
import { ExecutorOptions } from './types';
import { ActionGroupId, ES_QUERY_ID } from './constants';
import { executor } from './executor';
import { isEsQueryRule } from './util';

export interface AlertData extends RuleAlertData {
  [ALERT_RULE_NAME]: string;
  [ALERT_RULE_LINK]: string;
  [ALERT_HITS_COUNT]: number;
  [ALERT_HITS_HITS]: object[];
  [ALERT_MESSAGE]: string;
  [ALERT_TITLE]: string;
  [ALERT_CONDITIONS]: string;
  [ALERT_CONDITIONS_MET_VALUE]: number | string;
  [ALERT_DATE]: string;
  [ALERT_STATE_LAST_TIMESTAMP]: string;
  [ALERT_STATE_DATE_START]: string;
  [ALERT_STATE_DATE_END]: string;
}

export function getRuleType(
  core: CoreSetup
): RuleType<
  EsQueryRuleParams,
  EsQueryRuleParamsExtractedParams,
  EsQueryRuleState,
  {},
  ActionContext,
  typeof ActionGroupId,
  never,
  AlertData
> {
  const ruleTypeName = i18n.translate('xpack.stackAlerts.esQuery.alertTypeTitle', {
    defaultMessage: 'Elasticsearch query',
  });

  const actionGroupName = i18n.translate('xpack.stackAlerts.esQuery.actionGroupThresholdMetTitle', {
    defaultMessage: 'Query matched',
  });

  const actionVariableContextDateLabel = i18n.translate(
    'xpack.stackAlerts.esQuery.actionVariableContextDateLabel',
    {
      defaultMessage: 'The date that the alert met the threshold condition.',
    }
  );

  const actionVariableContextValueLabel = i18n.translate(
    'xpack.stackAlerts.esQuery.actionVariableContextValueLabel',
    {
      defaultMessage: 'The value that met the threshold condition.',
    }
  );

  const actionVariableContextHitsLabel = i18n.translate(
    'xpack.stackAlerts.esQuery.actionVariableContextHitsLabel',
    {
      defaultMessage: 'The documents that met the threshold condition.',
    }
  );

  const actionVariableContextMessageLabel = i18n.translate(
    'xpack.stackAlerts.esQuery.actionVariableContextMessageLabel',
    {
      defaultMessage: 'A message for the alert.',
    }
  );

  const actionVariableContextTitleLabel = i18n.translate(
    'xpack.stackAlerts.esQuery.actionVariableContextTitleLabel',
    {
      defaultMessage: 'A title for the alert.',
    }
  );

  const actionVariableContextIndexLabel = i18n.translate(
    'xpack.stackAlerts.esQuery.actionVariableContextIndexLabel',
    {
      defaultMessage: 'The indices the rule queries.',
    }
  );

  const actionVariableContextQueryLabel = i18n.translate(
    'xpack.stackAlerts.esQuery.actionVariableContextQueryLabel',
    {
      defaultMessage: 'The string representation of the Elasticsearch query.',
    }
  );

  const actionVariableContextSizeLabel = i18n.translate(
    'xpack.stackAlerts.esQuery.actionVariableContextSizeLabel',
    {
      defaultMessage:
        'The number of documents to pass to the configured actions when the threshold condition is met.',
    }
  );

  const actionVariableContextThresholdLabel = i18n.translate(
    'xpack.stackAlerts.esQuery.actionVariableContextThresholdLabel',
    {
      defaultMessage:
        'An array of rule threshold values. For between and notBetween thresholds, there are two values.',
    }
  );

  const actionVariableContextThresholdComparatorLabel = i18n.translate(
    'xpack.stackAlerts.esQuery.actionVariableContextThresholdComparatorLabel',
    {
      defaultMessage: 'The comparison function for the threshold.',
    }
  );

  const actionVariableContextConditionsLabel = i18n.translate(
    'xpack.stackAlerts.esQuery.actionVariableContextConditionsLabel',
    {
      defaultMessage: 'A string that describes the threshold condition.',
    }
  );

  const actionVariableSearchConfigurationLabel = i18n.translate(
    'xpack.stackAlerts.esQuery.actionVariableContextSearchConfigurationLabel',
    {
      defaultMessage:
        'The query definition, which uses KQL or Lucene to fetch the documents from Elasticsearch.',
    }
  );

  const actionVariableContextLinkLabel = i18n.translate(
    'xpack.stackAlerts.esQuery.actionVariableContextLinkLabel',
    {
      defaultMessage: `Navigate to Discover and show the records that triggered
       the alert when the rule is created in Discover. Otherwise, navigate to the status page for the rule.`,
    }
  );

  const alerts: IRuleTypeAlerts = {
    context: 'stack.esquery',
    mappings: {
      fieldMap: {
        [ALERT_RULE_NAME]: { type: 'keyword', array: false, required: false },
        [ALERT_RULE_LINK]: { type: 'text', array: false, required: false },
        [ALERT_HITS_COUNT]: { type: 'long', array: false, required: false },
        [ALERT_HITS_HITS]: { type: 'object', array: true, required: false },
        [ALERT_MESSAGE]: { type: 'text', array: false, required: false },
        [ALERT_TITLE]: { type: 'keyword', array: false, required: false },
        [ALERT_CONDITIONS]: { type: 'keyword', array: false, required: false },
        [ALERT_CONDITIONS_MET_VALUE]: { type: 'keyword', array: false, required: false },
        [ALERT_DATE]: { type: 'keyword', array: false, required: false },
        [ALERT_STATE_LAST_TIMESTAMP]: { type: 'keyword', array: false, required: false },
        [ALERT_STATE_DATE_START]: { type: 'keyword', array: false, required: false },
        [ALERT_STATE_DATE_END]: { type: 'keyword', array: false, required: false },
      },
    },
    shouldWrite: true,
  };

  return {
    id: ES_QUERY_ID,
    name: ruleTypeName,
    actionGroups: [{ id: ActionGroupId, name: actionGroupName }],
    defaultActionGroupId: ActionGroupId,
    validate: {
      params: EsQueryRuleParamsSchema,
    },
    actionVariables: {
      context: [
        { name: 'message', description: actionVariableContextMessageLabel },
        { name: 'title', description: actionVariableContextTitleLabel },
        { name: 'date', description: actionVariableContextDateLabel },
        { name: 'value', description: actionVariableContextValueLabel },
        { name: 'hits', description: actionVariableContextHitsLabel },
        { name: 'conditions', description: actionVariableContextConditionsLabel },
        { name: 'link', description: actionVariableContextLinkLabel, usesPublicBaseUrl: true },
      ],
      params: [
        { name: 'size', description: actionVariableContextSizeLabel },
        { name: 'threshold', description: actionVariableContextThresholdLabel },
        { name: 'thresholdComparator', description: actionVariableContextThresholdComparatorLabel },
        { name: 'searchConfiguration', description: actionVariableSearchConfigurationLabel },
        { name: 'esQuery', description: actionVariableContextQueryLabel },
        { name: 'index', description: actionVariableContextIndexLabel },
      ],
    },
    useSavedObjectReferences: {
      extractReferences: (params) => {
        if (isEsQueryRule(params.searchType)) {
          return { params: params as EsQueryRuleParamsExtractedParams, references: [] };
        }
        const [searchConfiguration, references] = extractReferences(params.searchConfiguration);
        const newParams = { ...params, searchConfiguration } as EsQueryRuleParamsExtractedParams;
        return { params: newParams, references };
      },
      injectReferences: (params, references) => {
        if (isEsQueryRule(params.searchType)) {
          return params;
        }
        return {
          ...params,
          searchConfiguration: injectReferences(params.searchConfiguration, references),
        };
      },
    },
    minimumLicenseRequired: 'basic',
    isExportable: true,
    executor: async (options: ExecutorOptions<EsQueryRuleParams>) => {
      return await executor(core, options);
    },
    producer: STACK_ALERTS_FEATURE_ID,
    doesSetRecoveryContext: true,
    alerts,
  };
}
