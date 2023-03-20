/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { useHistory } from 'react-router-dom';
import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiButtonEmpty } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { RuleStatus, useLoadRuleTypes } from '@kbn/triggers-actions-ui-plugin/public';
import { ALERTS_FEATURE_ID } from '@kbn/alerting-plugin/common';
import { createKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';

import { useKibana } from '../../utils/kibana_react';
import { usePluginContext } from '../../hooks/use_plugin_context';
import { useBreadcrumbs } from '../../hooks/use_breadcrumbs';
import { useGetFilteredRuleTypes } from '../../hooks/use_get_filtered_rule_types';

export function RulesPage() {
  const {
    http,
    docLinks,
    triggersActionsUi: {
      getAddRuleFlyout: AddRuleFlyout,
      getRulesList: RuleList,
      getRulesSettingsLink: RulesSettingsLink,
    },
  } = useKibana().services;
  const { ObservabilityPageTemplate } = usePluginContext();
  const history = useHistory();

  const filteredRuleTypes = useGetFilteredRuleTypes();
  const { ruleTypes } = useLoadRuleTypes({
    filteredRuleTypes,
  });

  const authorizedRuleTypes = [...ruleTypes.values()];
  const authorizedToCreateAnyRules = authorizedRuleTypes.some(
    (ruleType) => ruleType.authorizedConsumers[ALERTS_FEATURE_ID]?.all
  );

  const urlStateStorage = createKbnUrlStateStorage({
    history,
    useHash: false,
    useHashQuery: false,
  });

  const { status, lastResponse } = urlStateStorage.get<{
    status: RuleStatus[];
    lastResponse: string[];
  }>('_a') || { status: [], lastResponse: [] };

  const [stateStatus, setStatus] = useState<RuleStatus[]>(status);
  const [stateLastResponse, setLastResponse] = useState<string[]>(lastResponse);
  const [stateRefresh, setRefresh] = useState(new Date());

  const [addRuleFlyoutVisibility, setAddRuleFlyoutVisibility] = useState(false);

  useBreadcrumbs([
    {
      text: i18n.translate('xpack.observability.breadcrumbs.alertsLinkText', {
        defaultMessage: 'Alerts',
      }),
      href: http.basePath.prepend('/app/observability/alerts'),
    },
    {
      text: i18n.translate('xpack.observability.breadcrumbs.rulesLinkText', {
        defaultMessage: 'Rules',
      }),
    },
  ]);

  const handleStatusFilterChange = (newStatus: RuleStatus[]) => {
    setStatus(newStatus);
    urlStateStorage.set('_a', { status: newStatus, lastResponse });
    return { lastResponse: stateLastResponse || [], status: newStatus };
  };

  const handleLastRunOutcomeFilterChange = (newLastResponse: string[]) => {
    setRefresh(new Date());
    setLastResponse(newLastResponse);
    urlStateStorage.set('_a', { status, lastResponse: newLastResponse });
    return { lastResponse: newLastResponse, status: stateStatus || [] };
  };

  return (
    <ObservabilityPageTemplate
      pageHeader={{
        pageTitle: i18n.translate('xpack.observability.rulesTitle', {
          defaultMessage: 'Rules',
        }),
        rightSideItems: [
          <EuiButton
            data-test-subj="createRuleButton"
            disabled={!authorizedToCreateAnyRules}
            fill
            iconType="plusInCircle"
            key="create-alert"
            onClick={() => setAddRuleFlyoutVisibility(true)}
          >
            <FormattedMessage
              id="xpack.observability.rules.addRuleButtonLabel"
              defaultMessage="Create rule"
            />
          </EuiButton>,
          <RulesSettingsLink />,
          <EuiButtonEmpty
            data-test-subj="documentationLink"
            href={docLinks.links.observability.createAlerts}
            iconType="help"
            target="_blank"
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
            lastRunOutcomeFilter={stateLastResponse}
            refresh={stateRefresh}
            ruleDetailsRoute="alerts/rules/:ruleId"
            rulesListKey="observability_rulesListColumns"
            showActionFilter={false}
            statusFilter={stateStatus}
            visibleColumns={[
              'ruleName',
              'ruleExecutionStatusLastDate',
              'ruleSnoozeNotify',
              'ruleExecutionStatus',
              'ruleExecutionState',
            ]}
            onLastRunOutcomeFilterChange={handleLastRunOutcomeFilterChange}
            onStatusFilterChange={handleStatusFilterChange}
          />
        </EuiFlexItem>
      </EuiFlexGroup>

      {addRuleFlyoutVisibility && (
        <AddRuleFlyout
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
