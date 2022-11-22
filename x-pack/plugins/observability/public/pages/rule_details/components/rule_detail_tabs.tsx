/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useRef, useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTabbedContent,
  EuiTabbedContentTab,
} from '@elastic/eui';
import { AlertConsumers } from '@kbn/rule-data-utils';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useHistory, useLocation } from 'react-router-dom';
import { Query, BoolQuery } from '@kbn/es-query';
import { Rule, RuleType } from '@kbn/triggers-actions-ui-plugin/public';
import { RuleTypeParams } from '@kbn/alerting-plugin/common';
import { ALERTS_FEATURE_ID } from '@kbn/alerting-plugin/common';

import { ObservabilityAppServices } from '../../../application/types';
import { fromQuery, toQuery } from '../../../utils/url';
import { ObservabilityAlertSearchbarWithUrlSync } from '../../../components/shared/alert_search_bar';
import {
  EXECUTION_TAB,
  ALERTS_TAB,
  RULE_DETAILS_PAGE_ID,
  RULE_DETAILS_ALERTS_SEARCH_BAR_ID,
  URL_STORAGE_KEY,
} from '../constants';
import { TabId } from '../types';
import { observabilityFeatureId } from '../../../../common';

interface TabProps {
  rule: Rule<RuleTypeParams>;
  ruleType: RuleType<string, string> | undefined;
}

export function RuleDetailTabs({ rule, ruleType }: TabProps) {
  const {
    triggersActionsUi: {
      alertsTableConfigurationRegistry,
      getRuleEventLogList: RuleEventLogList,
      getAlertsStateTable: AlertsStateTable,
    },
  } = useKibana<ObservabilityAppServices>().services;

  const history = useHistory();
  const location = useLocation();

  const ruleQuery = useRef([
    { query: `kibana.alert.rule.uuid: ${rule.id}`, language: 'kuery' },
  ] as Query[]);

  const [esQuery, setEsQuery] = useState<{ bool: BoolQuery }>();

  const [tabId, setTabId] = useState<TabId>(
    (toQuery(location.search)?.tabId as TabId) || EXECUTION_TAB
  );

  const updateUrl = (nextQuery: { tabId: TabId }) => {
    history.push({
      ...location,
      search: fromQuery({
        ...toQuery(location.search),
        ...nextQuery,
      }),
    });
  };

  const onTabIdChange = (newTabId: TabId) => {
    setTabId(newTabId);
    updateUrl({ tabId: newTabId });
  };

  const features = (
    rule?.consumer === ALERTS_FEATURE_ID && ruleType?.producer ? ruleType.producer : rule?.consumer
  ) as AlertConsumers;

  const tabs: EuiTabbedContentTab[] = [
    {
      id: EXECUTION_TAB,
      name: i18n.translate('xpack.observability.ruleDetails.rule.eventLogTabText', {
        defaultMessage: 'Execution history',
      }),
      'data-test-subj': 'eventLogListTab',
      content: (
        <EuiFlexGroup style={{ minHeight: 600 }} direction="column">
          <EuiFlexItem>
            {ruleType ? <RuleEventLogList ruleId={rule?.id} ruleType={ruleType} /> : null}
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
            setEsQuery={setEsQuery}
            urlStorageKey={URL_STORAGE_KEY}
            queries={ruleQuery.current}
          />
          <EuiSpacer size="s" />
          <EuiFlexGroup direction="column" style={{ minHeight: 450 }}>
            <EuiFlexItem>
              {esQuery ? (
                <AlertsStateTable
                  alertsTableConfigurationRegistry={alertsTableConfigurationRegistry}
                  configurationId={observabilityFeatureId}
                  featureIds={[features]}
                  flyoutSize="s"
                  id={RULE_DETAILS_PAGE_ID}
                  query={esQuery}
                  showExpandToDetails={false}
                />
              ) : null}
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
      selectedTab={tabs.find((tab) => tab.id === tabId)}
      onTabClick={(tab) => {
        onTabIdChange(tab.id as TabId);
      }}
    />
  );
}
