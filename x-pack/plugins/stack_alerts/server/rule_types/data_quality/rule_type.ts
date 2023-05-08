/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { CoreSetup } from '@kbn/core/server';
import { extractReferences, injectReferences } from '@kbn/data-plugin/common';
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
import { ActionGroupId, DATA_QUALITY_ID } from './constants';
import { executor } from './executor';
import { isEsQueryRule } from './util';

export function getRuleType(
  core: CoreSetup
): RuleType<
  EsQueryRuleParams,
  EsQueryRuleParamsExtractedParams,
  EsQueryRuleState,
  {},
  ActionContext,
  typeof ActionGroupId
> {
  const ruleTypeName = i18n.translate('xpack.stackAlerts.dataQuality.alertTypeTitle', {
    defaultMessage: 'Data Quality',
  });

  const actionGroupName = i18n.translate(
    'xpack.stackAlerts.dataQuality.actionGroupThresholdMetTitle',
    {
      defaultMessage: 'Query matched',
    }
  );

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
      defaultMessage: 'The index the query was run against.',
    }
  );

  const actionVariableContextConditionsLabel = i18n.translate(
    'xpack.stackAlerts.esQuery.actionVariableContextConditionsLabel',
    {
      defaultMessage: 'A string that describes the threshold condition.',
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
    id: DATA_QUALITY_ID,
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
      params: [{ name: 'index', description: actionVariableContextIndexLabel }],
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
  };
}
