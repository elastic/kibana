/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useMemo, useState } from 'react';
import { get } from 'lodash';
import {
  EuiHorizontalRule,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiTabbedContentTab,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { ALERT_RULE_UUID } from '@kbn/rule-data-utils';
import { i18n } from '@kbn/i18n';
import { AlertFieldsTable, ScrollableFlyoutTabbedContent } from '@kbn/alerts-ui-shared';
import { AlertsTableFlyoutBaseProps } from '@kbn/triggers-actions-ui-plugin/public';
import { useKibana } from '../../utils/kibana_react';

import { paths } from '../../../common/locators/paths';

import { RULE_DETAILS_PAGE_ID } from '../../pages/rule_details/constants';
import type { TopAlert } from '../../typings/alerts';
import { Overview } from './alert_flyout_overview/alerts_flyout_overview';

interface FlyoutProps {
  rawAlert: AlertsTableFlyoutBaseProps['alert'];
  alert: TopAlert;
  id?: string;
}

type TabId = 'overview' | 'table';

export function AlertsFlyoutBody({ alert, rawAlert, id: pageId }: FlyoutProps) {
  const {
    http: {
      basePath: { prepend },
    },
  } = useKibana().services;

  const ruleId = get(alert.fields, ALERT_RULE_UUID) ?? null;
  const linkToRule =
    pageId !== RULE_DETAILS_PAGE_ID && ruleId && prepend
      ? prepend(paths.observability.ruleDetails(ruleId))
      : null;

  const overviewTab = useMemo(() => {
    return {
      id: 'overview',
      'data-test-subj': 'overviewTab',
      name: i18n.translate('xpack.observability.alertFlyout.overview', {
        defaultMessage: 'Overview',
      }),
      content: (
        <EuiPanel hasShadow={false} data-test-subj="overviewTabPanel">
          <EuiTitle size="xs">
            <h4>
              {i18n.translate('xpack.observability.alertsFlyout.reasonTitle', {
                defaultMessage: 'Reason',
              })}
            </h4>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiText size="s">{alert.reason}</EuiText>
          <EuiSpacer size="s" />
          {!!linkToRule && (
            <EuiLink href={linkToRule} data-test-subj="viewRuleDetailsFlyout">
              {i18n.translate('xpack.observability.alertsFlyout.viewRulesDetailsLinkText', {
                defaultMessage: 'View rule details',
              })}
            </EuiLink>
          )}
          <EuiHorizontalRule size="full" />
          <EuiTitle size="xs">
            <h4>
              {i18n.translate('xpack.observability.alertsFlyout.documentSummaryTitle', {
                defaultMessage: 'Document Summary',
              })}
            </h4>
          </EuiTitle>
          <EuiSpacer size="m" />
          <Overview alert={alert} />
        </EuiPanel>
      ),
    };
  }, [alert, linkToRule]);

  const metadataTab = useMemo(
    () => ({
      id: 'metadata',
      'data-test-subj': 'metadataTab',
      name: i18n.translate('xpack.observability.alertsFlyout.metadata', {
        defaultMessage: 'Metadata',
      }),
      content: (
        <EuiPanel hasShadow={false} data-test-subj="metadataTabPanel">
          <AlertFieldsTable alert={rawAlert} />
        </EuiPanel>
      ),
    }),
    [rawAlert]
  );

  const tabs = useMemo(() => [overviewTab, metadataTab], [overviewTab, metadataTab]);
  const [selectedTabId, setSelectedTabId] = useState<TabId>('overview');
  const handleTabClick = useCallback(
    (tab: EuiTabbedContentTab) => setSelectedTabId(tab.id as TabId),
    []
  );

  const selectedTab = useMemo(
    () => tabs.find((tab) => tab.id === selectedTabId) ?? tabs[0],
    [tabs, selectedTabId]
  );

  return (
    <ScrollableFlyoutTabbedContent
      tabs={tabs}
      selectedTab={selectedTab}
      onTabClick={handleTabClick}
      expand
      data-test-subj="defaultAlertFlyoutTabs"
    />
  );
}
