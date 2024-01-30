/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useMemo, useState } from 'react';
import { get } from 'lodash';
import {
  EuiSpacer,
  EuiTitle,
  EuiText,
  EuiLink,
  EuiHorizontalRule,
  EuiDescriptionList,
  EuiPanel,
  EuiTabbedContentTab,
} from '@elastic/eui';
import {
  AlertStatus,
  ALERT_DURATION,
  ALERT_EVALUATION_THRESHOLD,
  ALERT_EVALUATION_VALUE,
  ALERT_FLAPPING,
  ALERT_RULE_CATEGORY,
  ALERT_RULE_TYPE_ID,
  ALERT_RULE_UUID,
  ALERT_STATUS,
} from '@kbn/rule-data-utils';
import { i18n } from '@kbn/i18n';
import {
  AlertFieldsTable,
  AlertLifecycleStatusBadge,
  ScrollableFlyoutTabbedContent,
} from '@kbn/alerts-ui-shared';
import moment from 'moment-timezone';
import { useUiSetting } from '@kbn/kibana-react-plugin/public';
import { AlertsTableFlyoutBaseProps } from '@kbn/triggers-actions-ui-plugin/public';
import { useKibana } from '../../utils/kibana_react';
import { asDuration } from '../../../common/utils/formatters';
import { paths } from '../../../common/locators/paths';
import { formatAlertEvaluationValue } from '../../utils/format_alert_evaluation_value';
import { RULE_DETAILS_PAGE_ID } from '../../pages/rule_details/constants';
import type { TopAlert } from '../../typings/alerts';

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

  const dateFormat = useUiSetting<string>('dateFormat');

  const ruleId = get(alert.fields, ALERT_RULE_UUID) ?? null;
  const linkToRule =
    pageId !== RULE_DETAILS_PAGE_ID && ruleId && prepend
      ? prepend(paths.observability.ruleDetails(ruleId))
      : null;

  const overviewTab = useMemo(() => {
    const overviewListItems = [
      {
        title: i18n.translate('xpack.observability.alertsFlyout.statusLabel', {
          defaultMessage: 'Status',
        }),
        description: (
          <AlertLifecycleStatusBadge
            alertStatus={alert.fields[ALERT_STATUS] as AlertStatus}
            flapping={alert.fields[ALERT_FLAPPING]}
          />
        ),
      },
      {
        title: i18n.translate('xpack.observability.alertsFlyout.startedAtLabel', {
          defaultMessage: 'Started at',
        }),
        description: (
          <span title={alert.start.toString()}>{moment(alert.start).format(dateFormat)}</span>
        ),
      },
      {
        title: i18n.translate('xpack.observability.alertsFlyout.lastUpdatedLabel', {
          defaultMessage: 'Last updated',
        }),
        description: (
          <span title={alert.lastUpdated.toString()}>
            {moment(alert.lastUpdated).format(dateFormat)}
          </span>
        ),
      },
      {
        title: i18n.translate('xpack.observability.alertsFlyout.durationLabel', {
          defaultMessage: 'Duration',
        }),
        description: asDuration(alert.fields[ALERT_DURATION], { extended: true }),
      },
      {
        title: i18n.translate('xpack.observability.alertsFlyout.expectedValueLabel', {
          defaultMessage: 'Expected value',
        }),
        description: formatAlertEvaluationValue(
          alert.fields[ALERT_RULE_TYPE_ID],
          alert.fields[ALERT_EVALUATION_THRESHOLD]
        ),
      },
      {
        title: i18n.translate('xpack.observability.alertsFlyout.actualValueLabel', {
          defaultMessage: 'Actual value',
        }),
        description: formatAlertEvaluationValue(
          alert.fields[ALERT_RULE_TYPE_ID],
          alert.fields[ALERT_EVALUATION_VALUE]
        ),
      },
      {
        title: i18n.translate('xpack.observability.alertsFlyout.ruleTypeLabel', {
          defaultMessage: 'Rule type',
        }),
        description: alert.fields[ALERT_RULE_CATEGORY] ?? '-',
      },
    ];

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
          <EuiDescriptionList
            compressed={true}
            type="responsiveColumn"
            listItems={overviewListItems}
            titleProps={{
              'data-test-subj': 'alertsFlyoutDescriptionListTitle',
            }}
            descriptionProps={{
              'data-test-subj': 'alertsFlyoutDescriptionListDescription',
            }}
          />
        </EuiPanel>
      ),
    };
  }, [alert.fields, alert.lastUpdated, alert.reason, alert.start, dateFormat, linkToRule]);

  const tableTab = useMemo(
    () => ({
      id: 'table',
      'data-test-subj': 'tableTab',
      name: i18n.translate('xpack.observability.alertsFlyout.table', { defaultMessage: 'Table' }),
      content: (
        <EuiPanel hasShadow={false} data-test-subj="tableTabPanel">
          <AlertFieldsTable alert={rawAlert} />
        </EuiPanel>
      ),
    }),
    [rawAlert]
  );

  const tabs = useMemo(() => [overviewTab, tableTab], [overviewTab, tableTab]);
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
