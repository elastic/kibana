/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useMemo } from 'react';
import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiButtonEmpty } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useLoadRuleTypes } from '@kbn/triggers-actions-ui-plugin/public';
import type { RulesListVisibleColumns } from '@kbn/triggers-actions-ui-plugin/public';
import { ALERTS_FEATURE_ID } from '@kbn/alerting-plugin/common';

import { usePluginContext } from '../../hooks/use_plugin_context';
import { Provider, rulesPageStateContainer, useRulesPageStateContainer } from './state_container';

import { useBreadcrumbs } from '../../hooks/use_breadcrumbs';
import { useKibana } from '../../utils/kibana_react';
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
  const { ObservabilityPageTemplate, observabilityRuleTypeRegistry } = usePluginContext();
  const { http, docLinks, triggersActionsUi } = useKibana().services;

  const documentationLink = docLinks.links.observability.createAlerts;

  const filteredRuleTypes = useMemo(
    () => observabilityRuleTypeRegistry.list(),
    [observabilityRuleTypeRegistry]
  );

  const { status, setStatus, lastResponse, setLastResponse } = useRulesPageStateContainer();
  const [createRuleFlyoutVisibility, setCreateRuleFlyoutVisibility] = useState(false);
  const [refresh, setRefresh] = useState(new Date());
  const { ruleTypes } = useLoadRuleTypes({
    filteredRuleTypes,
  });
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

  const CreateRuleFlyout = useMemo(
    () =>
      triggersActionsUi.getAddAlertFlyout({
        consumer: ALERTS_FEATURE_ID,
        onClose: () => {
          setCreateRuleFlyoutVisibility(false);
        },
        onSave: () => {
          setRefresh(new Date());
          return Promise.resolve();
        },
        filteredRuleTypes,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filteredRuleTypes]
  );

  const getRulesTable = useMemo(() => {
    return (
      <>
        <EuiFlexGroup direction="column" gutterSize="s">
          <EuiFlexItem>
            {triggersActionsUi.getRulesList({
              filteredRuleTypes,
              showActionFilter: false,
              showCreateRuleButton: false,
              ruleDetailsRoute: 'alerts/rules/:ruleId',
              statusFilter: status,
              onStatusFilterChange: setStatus,
              lastResponseFilter: lastResponse,
              onLastResponseFilterChange: setLastResponse,
              refresh,
              rulesListKey: RULES_LIST_COLUMNS_KEY,
              visibleColumns: RULES_LIST_COLUMNS,
            })}
          </EuiFlexItem>
        </EuiFlexGroup>
      </>
    );
  }, [
    triggersActionsUi,
    filteredRuleTypes,
    status,
    setStatus,
    lastResponse,
    setLastResponse,
    refresh,
  ]);
  return (
    <ObservabilityPageTemplate
      pageHeader={{
        pageTitle: <>{RULES_PAGE_TITLE}</>,
        rightSideItems: [
          authorizedToCreateAnyRules && (
            <EuiButton
              iconType="plusInCircle"
              key="create-alert"
              data-test-subj="createRuleButton"
              fill
              onClick={() => setCreateRuleFlyoutVisibility(true)}
            >
              <FormattedMessage
                id="xpack.observability.rules.addRuleButtonLabel"
                defaultMessage="Create rule"
              />
            </EuiButton>
          ),
          <EuiButtonEmpty
            href={documentationLink}
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
    >
      {getRulesTable}
      {createRuleFlyoutVisibility && CreateRuleFlyout}
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
