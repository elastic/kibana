/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiButtonEmpty } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useLoadRuleTypes } from '@kbn/triggers-actions-ui-plugin/public';
import { ALERTS_FEATURE_ID } from '@kbn/alerting-plugin/common';
import type { RulesListVisibleColumns } from '@kbn/triggers-actions-ui-plugin/public';

import { Provider, rulesPageStateContainer, useRulesPageStateContainer } from './state_container';
import { useKibana } from '../../utils/kibana_react';
import { usePluginContext } from '../../hooks/use_plugin_context';
import { useBreadcrumbs } from '../../hooks/use_breadcrumbs';
import { useGetFilteredRuleTypes } from '../../hooks/use_get_filtered_rule_types';
import { RULES_PAGE_TITLE, RULES_BREADCRUMB_TEXT } from './translations';

const RULES_LIST_COLUMNS_KEY = 'observability_rulesListColumns';
const RULES_LIST_COLUMNS: RulesListVisibleColumns[] = [
  'ruleName',
  'ruleExecutionStatusLastDate',
  'ruleSnoozeNotify',
  'ruleExecutionStatus',
  'ruleExecutionState',
];

function RulesPage() {
  const { ObservabilityPageTemplate } = usePluginContext();
  const {
    http,
    docLinks,
    triggersActionsUi: { getAddAlertFlyout: AddAlertFlyout, getRulesList: RuleList },
  } = useKibana().services;

  const { status, setStatus, lastResponse, setLastResponse } = useRulesPageStateContainer();

  const filteredRuleTypes = useGetFilteredRuleTypes();
  const { ruleTypes } = useLoadRuleTypes({
    filteredRuleTypes,
  });

  const [addRuleFlyoutVisibility, setAddRuleFlyoutVisibility] = useState(false);
  const [refresh, setRefresh] = useState(new Date());

  const authorizedRuleTypes = [...ruleTypes.values()];

  const authorizedToCreateAnyRules = authorizedRuleTypes.some(
    (ruleType) => ruleType.authorizedConsumers[ALERTS_FEATURE_ID]?.all
  );

  useBreadcrumbs([
    {
      text: i18n.translate('xpack.observability.breadcrumbs.alertsLinkText', {
        defaultMessage: 'Alerts',
      }),
      href: http.basePath.prepend('/app/observability/alerts'),
    },
    {
      text: RULES_BREADCRUMB_TEXT,
    },
  ]);

  return (
    <ObservabilityPageTemplate
      pageHeader={{
        pageTitle: <>{RULES_PAGE_TITLE}</>,
        rightSideItems: [
          <EuiButton
            fill
            key="create-alert"
            iconType="plusInCircle"
            data-test-subj="createRuleButton"
            disabled={!authorizedToCreateAnyRules}
            onClick={() => setAddRuleFlyoutVisibility(true)}
          >
            <FormattedMessage
              id="xpack.observability.rules.addRuleButtonLabel"
              defaultMessage="Create rule"
            />
          </EuiButton>,
          <EuiButtonEmpty
            href={docLinks.links.observability.createAlerts}
            target="_blank"
            iconType="help"
            data-test-subj="documentationLink"
          >
            <FormattedMessage
              id="xpack.observability.rules.docsLinkText"
              defaultMessage="Documentation"
            />
          </EuiButtonEmpty>,
        ],
      }}
      data-test-subj="rulesPage"
    >
      <EuiFlexGroup direction="column" gutterSize="s">
        <EuiFlexItem>
          <RuleList
            filteredRuleTypes={filteredRuleTypes}
            showActionFilter={false}
            ruleDetailsRoute="alerts/rules/:ruleId"
            statusFilter={status}
            onStatusFilterChange={setStatus}
            lastResponseFilter={lastResponse}
            onLastResponseFilterChange={setLastResponse}
            refresh={refresh}
            rulesListKey={RULES_LIST_COLUMNS_KEY}
            visibleColumns={RULES_LIST_COLUMNS}
          />
        </EuiFlexItem>
      </EuiFlexGroup>

      {addRuleFlyoutVisibility && (
        <AddAlertFlyout
          consumer={ALERTS_FEATURE_ID}
          filteredRuleTypes={filteredRuleTypes}
          onClose={() => {
            setAddRuleFlyoutVisibility(false);
          }}
          onSave={() => {
            setRefresh(new Date());
            return Promise.resolve();
          }}
        />
      )}
    </ObservabilityPageTemplate>
  );
}

function WrappedRulesPage() {
  return (
    <Provider value={rulesPageStateContainer}>
      <RulesPage />
    </Provider>
  );
}

export { WrappedRulesPage as RulesPage };
