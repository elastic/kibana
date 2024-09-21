/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { CoreSetup, DEFAULT_APP_CATEGORIES } from '@kbn/core/server';
import { extractReferences, injectReferences } from '@kbn/data-plugin/common';
import { ES_QUERY_ID, STACK_ALERTS_FEATURE_ID } from '@kbn/rule-data-utils';
import { STACK_ALERTS_AAD_CONFIG } from '..';
import { RuleType } from '../../types';
import { ActionContext } from './action_context';
import {
  EsQueryRuleParams,
  EsQueryRuleParamsExtractedParams,
  EsQueryRuleParamsSchema,
  EsQueryRuleState,
  validateServerless,
} from './rule_type_params';
import { ExecutorOptions } from './types';
import { ActionGroupId } from './constants';
import { executor } from './executor';
import { isSearchSourceRule } from './util';
import { StackAlertType } from '../types';
import { getDataScope } from './lib/get_data_scope';

export function getRuleType(
  core: CoreSetup,
  isServerless: boolean
): RuleType<
  EsQueryRuleParams,
  EsQueryRuleParamsExtractedParams,
  EsQueryRuleState,
  {},
  ActionContext,
  typeof ActionGroupId,
  never,
  StackAlertType
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

  const actionVariableEsqlQueryLabel = i18n.translate(
    'xpack.stackAlerts.esQuery.actionVariableContextEsqlQueryLabel',
    {
      defaultMessage: 'ES|QL query field used to fetch data from Elasticsearch.',
    }
  );

  const actionVariableContextLinkLabel = i18n.translate(
    'xpack.stackAlerts.esQuery.actionVariableContextLinkLabel',
    {
      defaultMessage: `Navigate to Discover and show the records that triggered
       the alert when the rule is created in Discover. Otherwise, navigate to the status page for the rule.`,
    }
  );

  return {
    id: ES_QUERY_ID,
    name: ruleTypeName,
    actionGroups: [{ id: ActionGroupId, name: actionGroupName }],
    defaultActionGroupId: ActionGroupId,
    validate: {
      params: {
        validate: (object: unknown) => {
          const validated = EsQueryRuleParamsSchema.validate(object);
          if (isServerless) {
            validateServerless(validated);
          }
          return validated;
        },
      },
    },
    schemas: {
      params: {
        type: 'config-schema',
        schema: EsQueryRuleParamsSchema,
      },
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
        { name: 'esqlQuery', description: actionVariableEsqlQueryLabel },
      ],
    },
    useSavedObjectReferences: {
      extractReferences: (params) => {
        if (isSearchSourceRule(params.searchType)) {
          const [searchConfiguration, references] = extractReferences(params.searchConfiguration);
          const newParams = { ...params, searchConfiguration } as EsQueryRuleParamsExtractedParams;
          return { params: newParams, references };
        }

        return { params: params as EsQueryRuleParamsExtractedParams, references: [] };
      },
      injectReferences: (params, references) => {
        if (isSearchSourceRule(params.searchType)) {
          return {
            ...params,
            searchConfiguration: injectReferences(params.searchConfiguration, references),
          };
        }
        return params;
      },
    },
    getDataScope: (params) => {
      return getDataScope(params);
    },
    minimumLicenseRequired: 'basic',
    isExportable: true,
    executor: async (options: ExecutorOptions<EsQueryRuleParams>) => {
      return await executor(core, options);
    },
    category: DEFAULT_APP_CATEGORIES.management.id,
    producer: STACK_ALERTS_FEATURE_ID,
    doesSetRecoveryContext: true,
    alerts: STACK_ALERTS_AAD_CONFIG,
  };
}
