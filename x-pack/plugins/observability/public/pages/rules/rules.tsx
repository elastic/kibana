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
import { RuleStatus, useLoadRuleTypes } from '@kbn/triggers-actions-ui-plugin/public';
import { ALERTS_FEATURE_ID } from '@kbn/alerting-plugin/common';

import { useKibana } from '../../utils/kibana_react';
import { usePluginContext } from '../../hooks/use_plugin_context';
import { useBreadcrumbs } from '../../hooks/use_breadcrumbs';
import { useGetFilteredRuleTypes } from '../../hooks/use_get_filtered_rule_types';

export function RulesPage() {
  const { ObservabilityPageTemplate } = usePluginContext();
  const {
    http,
    docLinks,
    triggersActionsUi: {
      getAddAlertFlyout: AddRuleFlyout,
      getRulesList: RuleList,
      getRulesSettingsLink: RulesSettingsLink,
    },
  } = useKibana().services;

  const filteredRuleTypes = useGetFilteredRuleTypes();
  const { ruleTypes } = useLoadRuleTypes({
    filteredRuleTypes,
  });

  const authorizedRuleTypes = [...ruleTypes.values()];
  const authorizedToCreateAnyRules = authorizedRuleTypes.some(
    (ruleType) => ruleType.authorizedConsumers[ALERTS_FEATURE_ID]?.all
  );

  const [status, setStatus] = useState<RuleStatus[]>([]);
  const [lastResponse, setLastResponse] = useState<string[]>([]);
  const [refresh, setRefresh] = useState(new Date());

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

  const handleLastResponseFilterChange = (newLastResponse: string[]) => {
    setLastResponse(newLastResponse);
    return { lastResponse: newLastResponse, status };
  };

  const handleStatusFilterChange = (newStatus: RuleStatus[]) => {
    setStatus(newStatus);
    return { lastResponse, status: newStatus };
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
            lastResponseFilter={lastResponse}
            refresh={refresh}
            ruleDetailsRoute="alerts/rules/:ruleId"
            rulesListKey="observability_rulesListColumns"
            showActionFilter={false}
            statusFilter={status}
            visibleColumns={[
              'ruleName',
              'ruleExecutionStatusLastDate',
              'ruleSnoozeNotify',
              'ruleExecutionStatus',
              'ruleExecutionState',
            ]}
            onLastResponseFilterChange={handleLastResponseFilterChange}
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
