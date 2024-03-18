/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useRef } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiTabbedContent,
  EuiTabbedContentTab,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { RuleTypeParams } from '@kbn/alerting-plugin/common';
import type { AlertConsumers } from '@kbn/rule-data-utils';
import type { Rule } from '@kbn/triggers-actions-ui-plugin/public';
import type { Query, BoolQuery } from '@kbn/es-query';
import { useKibana } from '../../../utils/kibana_react';
import { ObservabilityAlertSearchbarWithUrlSync } from '../../../components/alert_search_bar/alert_search_bar_with_url_sync';
import { RULE_DETAILS_ALERTS_TABLE_CONFIG_ID } from '../../../constants';
import {
  RULE_DETAILS_ALERTS_TAB,
  RULE_DETAILS_EXECUTION_TAB,
  RULE_DETAILS_ALERTS_SEARCH_BAR_ID,
  RULE_DETAILS_PAGE_ID,
  RULE_DETAILS_SEARCH_BAR_URL_STORAGE_KEY,
} from '../constants';
import type { TabId } from '../rule_details';

interface Props {
  activeTabId: TabId;
  esQuery:
    | {
        bool: BoolQuery;
      }
    | undefined;
  featureIds: AlertConsumers[] | undefined;
  rule: Rule<RuleTypeParams>;
  ruleId: string;
  ruleType: any;
  onEsQueryChange: (query: { bool: BoolQuery }) => void;
  onSetTabId: (tabId: TabId) => void;
}

export function RuleDetailsTabs({
  activeTabId,
  esQuery,
  featureIds,
  rule,
  ruleId,
  ruleType,
  onSetTabId,
  onEsQueryChange,
}: Props) {
  const {
    triggersActionsUi: {
      alertsTableConfigurationRegistry,
      getAlertsStateTable: AlertsStateTable,
      getRuleEventLogList: RuleEventLogList,
    },
  } = useKibana().services;

  const ruleQuery = useRef<Query[]>([
    { query: `kibana.alert.rule.uuid: ${ruleId}`, language: 'kuery' },
  ]);

  const tabs: EuiTabbedContentTab[] = [
    {
      id: RULE_DETAILS_ALERTS_TAB,
      name: i18n.translate('xpack.observability.ruleDetails.rule.alertsTabText', {
        defaultMessage: 'Alerts',
      }),
      'data-test-subj': 'ruleAlertListTab',
      content: (
        <>
          <EuiSpacer size="m" />

          <ObservabilityAlertSearchbarWithUrlSync
            appName={RULE_DETAILS_ALERTS_SEARCH_BAR_ID}
            onEsQueryChange={onEsQueryChange}
            urlStorageKey={RULE_DETAILS_SEARCH_BAR_URL_STORAGE_KEY}
            defaultSearchQueries={ruleQuery.current}
          />
          <EuiSpacer size="s" />

          <EuiFlexGroup style={{ minHeight: 450 }} direction={'column'}>
            <EuiFlexItem>
              {esQuery && featureIds && (
                <AlertsStateTable
                  alertsTableConfigurationRegistry={alertsTableConfigurationRegistry}
                  configurationId={RULE_DETAILS_ALERTS_TABLE_CONFIG_ID}
                  id={RULE_DETAILS_PAGE_ID}
                  featureIds={featureIds}
                  query={esQuery}
                  showAlertStatusWithFlapping
                />
              )}
            </EuiFlexItem>
          </EuiFlexGroup>
        </>
      ),
    },
    {
      id: RULE_DETAILS_EXECUTION_TAB,
      name: i18n.translate('xpack.observability.ruleDetails.rule.eventLogTabText', {
        defaultMessage: 'Execution history',
      }),
      'data-test-subj': 'eventLogListTab',
      content: (
        <EuiFlexGroup style={{ minHeight: 600 }} direction={'column'}>
          <EuiFlexItem>
            {rule && ruleType ? <RuleEventLogList ruleId={rule.id} ruleType={ruleType} /> : null}
          </EuiFlexItem>
        </EuiFlexGroup>
      ),
    },
  ];

  const handleTabIdChange = (newTabId: TabId) => {
    onSetTabId(newTabId);
  };

  return (
    <EuiTabbedContent
      data-test-subj="ruleDetailsTabbedContent"
      tabs={tabs}
      selectedTab={tabs.find((tab) => tab.id === activeTabId)}
      onTabClick={(tab) => {
        handleTabIdChange(tab.id as TabId);
      }}
    />
  );
}
