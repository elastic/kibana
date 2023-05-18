/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useRef, useState } from 'react';
import { useHistory } from 'react-router-dom';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiTabbedContent,
  EuiTabbedContentTab,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { Rule, RuleType } from '@kbn/triggers-actions-ui-plugin/public';
import type { RuleTypeParams } from '@kbn/alerting-plugin/common';
import type { BoolQuery, Query } from '@kbn/es-query';
import type { AlertConsumers } from '@kbn/rule-data-utils';
import { useKibana } from '../../../utils/kibana_react';
import { ObservabilityAlertSearchbarWithUrlSync } from '../../../components/alert_search_bar/alert_search_bar_with_url_sync';
import {
  ALERTS_TAB,
  EXECUTION_TAB,
  RULE_DETAILS_ALERTS_SEARCH_BAR_ID,
  RULE_DETAILS_PAGE_ID,
  SEARCH_BAR_URL_STORAGE_KEY,
  TabId,
} from '../rule_details';
import { fromQuery, toQuery } from '../../../utils/url';
import { observabilityFeatureId } from '../../../../common';

interface RuleDetailTabsProps {
  activeTab: TabId;
  featureIds: AlertConsumers[] | undefined;
  rule: Rule<RuleTypeParams>;
  ruleId: string;
  ruleType: RuleType<string, string> | undefined;
  onChangeTab: (tabId: TabId) => void;
  onChangeEsQuery: (bool: { bool: BoolQuery } | undefined) => void;
}

export function RuleDetailTabs({
  activeTab,
  featureIds,
  rule,
  ruleId,
  ruleType,
  onChangeTab,
  onChangeEsQuery,
}: RuleDetailTabsProps) {
  const {
    triggersActionsUi: {
      alertsTableConfigurationRegistry,
      getRuleEventLogList: RuleEventLogList,
      getAlertsStateTable: AlertsStateTable,
    },
  } = useKibana().services;
  const history = useHistory();

  const ruleQuery = useRef<Query[]>([
    { query: `kibana.alert.rule.uuid: ${ruleId}`, language: 'kuery' },
  ]);

  const [esQuery, setEsQuery] = useState<{ bool: BoolQuery }>();

  const updateUrl = (nextQuery: { tabId: TabId }) => {
    const newTabId = nextQuery.tabId;
    const nextSearch =
      newTabId === ALERTS_TAB
        ? {
            ...toQuery(location.search),
            ...nextQuery,
          }
        : { tabId: EXECUTION_TAB };

    history.replace({
      ...location,
      search: fromQuery(nextSearch),
    });
  };

  const handleTabIdChange = (newTabId: TabId) => {
    onChangeTab(newTabId);
    updateUrl({ tabId: newTabId });
  };

  const handleEsQueryChange = (newQuery: { bool: BoolQuery } | undefined) => {
    setEsQuery(newQuery);

    if (newQuery) {
      onChangeEsQuery(newQuery);
    }
  };

  const tabs: EuiTabbedContentTab[] = [
    {
      id: EXECUTION_TAB,
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
    {
      id: ALERTS_TAB,
      name: i18n.translate('xpack.observability.ruleDetails.rule.alertsTabText', {
        defaultMessage: 'Alerts',
      }),
      'data-test-subj': 'ruleAlertListTab',
      content: (
        <>
          <EuiSpacer size="m" />
          <ObservabilityAlertSearchbarWithUrlSync
            appName={RULE_DETAILS_ALERTS_SEARCH_BAR_ID}
            onEsQueryChange={handleEsQueryChange}
            urlStorageKey={SEARCH_BAR_URL_STORAGE_KEY}
            defaultSearchQueries={ruleQuery.current}
          />
          <EuiSpacer size="s" />
          <EuiFlexGroup style={{ minHeight: 450 }} direction={'column'}>
            <EuiFlexItem>
              {esQuery && featureIds && (
                <AlertsStateTable
                  alertsTableConfigurationRegistry={alertsTableConfigurationRegistry}
                  configurationId={observabilityFeatureId}
                  id={RULE_DETAILS_PAGE_ID}
                  flyoutSize="s"
                  featureIds={featureIds}
                  query={esQuery}
                  showExpandToDetails={false}
                  showAlertStatusWithFlapping
                />
              )}
            </EuiFlexItem>
          </EuiFlexGroup>
        </>
      ),
    },
  ];

  return (
    <EuiTabbedContent
      data-test-subj="rule-detail-tabs"
      tabs={tabs}
      selectedTab={tabs.find((tab) => tab.id === activeTab)}
      onTabClick={({ id }) => {
        handleTabIdChange(id as TabId);
      }}
    />
  );
}
