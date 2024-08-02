/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazy } from 'react';
import { i18n } from '@kbn/i18n';
import { RuleTypeModel } from '@kbn/triggers-actions-ui-plugin/public';
import { PluginSetupContract as AlertingSetup } from '@kbn/alerting-plugin/public';
import { SanitizedRule } from '@kbn/alerting-plugin/common';
import { ES_QUERY_ID, STACK_ALERTS_FEATURE_ID } from '@kbn/rule-data-utils';
import { EsQueryRuleParams, SearchType } from './types';
import { validateExpression } from './validation';
import { isSearchSourceRule } from './util';

const PLUGIN_ID = 'discover';

export function getRuleType(alerting: AlertingSetup): RuleTypeModel<EsQueryRuleParams> {
  registerNavigation(alerting);
  return {
    id: ES_QUERY_ID,
    description: i18n.translate('xpack.stackAlerts.esQuery.ui.alertType.descriptionText', {
      defaultMessage: 'Alert when matches are found during the latest query run.',
    }),
    iconClass: 'logoElastic',
    documentationUrl: (docLinks) => docLinks.links.alerting.esQuery,
    ruleParamsExpression: lazy(() => import('./expression')),
    validate: validateExpression,
    defaultActionMessage: i18n.translate(
      'xpack.stackAlerts.esQuery.ui.alertType.defaultActionMessage',
      {
        defaultMessage: `Elasticsearch query rule '{{rule.name}}' is active:

- Value: '{{context.value}}'
- Conditions Met: '{{context.conditions}}' over '{{rule.params.timeWindowSize}}''{{rule.params.timeWindowUnit}}'
- Timestamp: '{{context.date}}'
- Link: '{{context.link}}'`,
      }
    ),
    requiresAppContext: false,
  };
}

function registerNavigation(alerting: AlertingSetup) {
  alerting.registerNavigation(
    PLUGIN_ID,
    ES_QUERY_ID,
    (rule: SanitizedRule<EsQueryRuleParams<SearchType.searchSource>>) => {
      return `/app/discover#/viewAlert/${rule.id}`;
    }
  );
  alerting.registerNavigation(
    STACK_ALERTS_FEATURE_ID,
    ES_QUERY_ID,
    (rule: SanitizedRule<EsQueryRuleParams<SearchType.searchSource>>) => {
      if (isSearchSourceRule(rule.params)) return `/app/discover#/viewAlert/${rule.id}`;
      return;
    }
  );
  alerting.registerNavigation(
    'logs',
    ES_QUERY_ID,
    (rule: SanitizedRule<EsQueryRuleParams<SearchType.searchSource>>) => {
      if (isSearchSourceRule(rule.params)) return `/app/discover#/viewAlert/${rule.id}`;
      return;
    }
  );
  alerting.registerNavigation(
    'infrastructure',
    ES_QUERY_ID,
    (rule: SanitizedRule<EsQueryRuleParams<SearchType.searchSource>>) => {
      if (isSearchSourceRule(rule.params)) return `/app/discover#/viewAlert/${rule.id}`;
      return;
    }
  );
  alerting.registerNavigation(
    'observability',
    ES_QUERY_ID,
    (rule: SanitizedRule<EsQueryRuleParams<SearchType.searchSource>>) => {
      if (isSearchSourceRule(rule.params)) return `/app/discover#/viewAlert/${rule.id}`;
      return;
    }
  );
}
