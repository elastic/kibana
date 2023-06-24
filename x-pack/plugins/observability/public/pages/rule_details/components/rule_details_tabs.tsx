/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useRef } from 'react';
import { useHistory } from 'react-router-dom';
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
import { toQuery, fromQuery } from '../../../utils/url';
import { observabilityFeatureId } from '../../../../common';
import {
  ALERTS_TAB,
  EXECUTION_TAB,
  RULE_DETAILS_ALERTS_SEARCH_BAR_ID,
  RULE_DETAILS_PAGE_ID,
  SEARCH_BAR_URL_STORAGE_KEY,
} from '../constants';
import type { TabId } from '../rule_details';

interface Props {
  esQuery:
    | {
        bool: BoolQuery;
      }
    | undefined;
  featureIds: AlertConsumers[] | undefined;
  rule: Rule<RuleTypeParams>;
  ruleId: string;
  ruleType: any;
  tabId: TabId;
  onSetTabId: (tabId: TabId) => void;
  onEsQueryChange: (query: { bool: BoolQuery }) => void;
}

export function RuleDetailsTabs({
  esQuery,
  featureIds,
  rule,
  ruleId,
  ruleType,
  tabId,
  onSetTabId,
  onEsQueryChange,
}: Props) {
  const history = useHistory();

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
            onEsQueryChange={onEsQueryChange}
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

  const handleTabIdChange = (newTabId: TabId) => {
    updateUrl({ tabId: newTabId });
    onSetTabId(newTabId);
  };

  return (
    <EuiTabbedContent
      data-test-subj="ruleDetailsTabbedContent"
      tabs={tabs}
      selectedTab={tabs.find((tab) => tab.id === tabId)}
      onTabClick={(tab) => {
        handleTabIdChange(tab.id as TabId);
      }}
    />
  );
}
