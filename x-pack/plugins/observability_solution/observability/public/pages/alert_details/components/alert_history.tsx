/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiText,
  EuiSpacer,
  EuiLoadingSpinner,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ALERT_INSTANCE_ID, ALERT_RULE_UUID } from '@kbn/rule-data-utils';
import { useAlertsHistory } from '@kbn/observability-alert-details';
import type { Rule } from '@kbn/triggers-actions-ui-plugin/public';
import { convertTo } from '../../../../common/utils/formatters';
import { useKibana } from '../../../utils/kibana_react';
import { TopAlert } from '../../..';
import { getDefaultAlertSummaryTimeRange } from '../../../utils/alert_summary_widget';

interface Props {
  alert: TopAlert;
  rule: Rule;
}

const dateRange = {
  from: 'now-30d',
  to: 'now+1d',
};

export function AlertHistoryChart({ rule, alert }: Props) {
  const {
    http,
    notifications,
    triggersActionsUi: { getAlertSummaryWidget: AlertSummaryWidget },
  } = useKibana().services;

  const instanceId = alert.fields[ALERT_INSTANCE_ID];
  const ruleId = alert.fields[ALERT_RULE_UUID];
  const ruleTypeIds = [rule.ruleTypeId];
  const consumers = [rule.consumer];

  const {
    data: { avgTimeToRecoverUS, totalTriggeredAlerts },
    isLoading,
    isError,
  } = useAlertsHistory({
    http,
    ruleTypeIds,
    consumers,
    ruleId: rule.id,
    dateRange,
    instanceId,
  });

  if (isError) {
    notifications?.toasts.addDanger({
      title: i18n.translate('xpack.observability.alertDetailsPage.alertHistory.error.toastTitle', {
        defaultMessage: 'Alerts history chart error',
      }),
      text: i18n.translate(
        'xpack.observability.alertDetailsPage.alertHistory.error.toastDescription',
        {
          defaultMessage: `An error occurred when fetching alert history chart data`,
        }
      ),
    });
  }

  return (
    <EuiPanel hasBorder={true} data-test-subj="AlertDetails">
      <EuiFlexGroup direction="column" gutterSize="none" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiTitle size="xs">
            <h2>
              {i18n.translate('xpack.observability.alertDetailsPage.alertHistory.chartTitle', {
                defaultMessage: 'Alerts history',
              })}
            </h2>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="s" color="subdued">
            {i18n.translate('xpack.observability.alertDetailsPage.alertHistory.last30days', {
              defaultMessage: 'Last 30 days',
            })}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <EuiFlexGroup gutterSize="l">
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="xs" direction="column">
            <EuiFlexItem grow={false}>
              <EuiText color="danger">
                <EuiTitle size="s">
                  <h3>
                    {isLoading ? <EuiLoadingSpinner size="s" /> : totalTriggeredAlerts || '-'}
                  </h3>
                </EuiTitle>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="s" color="subdued">
                {i18n.translate(
                  'xpack.observability.alertDetailsPage.alertHistory.alertsTriggered',
                  {
                    defaultMessage: 'Alerts triggered',
                  }
                )}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexGroup gutterSize="xs" direction="column">
          <EuiFlexItem grow={false}>
            <EuiText>
              <EuiTitle size="s">
                <h3>
                  {isLoading ? (
                    <EuiLoadingSpinner size="s" />
                  ) : avgTimeToRecoverUS ? (
                    convertTo({
                      unit: 'minutes',
                      microseconds: avgTimeToRecoverUS,
                      extended: true,
                    }).formatted
                  ) : (
                    '-'
                  )}
                </h3>
              </EuiTitle>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="s" color="subdued">
              {i18n.translate(
                'xpack.observability.alertDetailsPage.alertHistory.avgTimeToRecover',
                {
                  defaultMessage: 'Avg time to recover',
                }
              )}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <AlertSummaryWidget
        ruleTypeIds={ruleTypeIds}
        consumers={consumers}
        timeRange={getDefaultAlertSummaryTimeRange()}
        fullSize
        hideStats
        filter={{
          bool: {
            must: [
              {
                term: {
                  [ALERT_RULE_UUID]: ruleId,
                },
              },
              ...(instanceId && instanceId !== '*'
                ? [
                    {
                      term: {
                        [ALERT_INSTANCE_ID]: instanceId,
                      },
                    },
                  ]
                : []),
            ],
          },
        }}
      />
    </EuiPanel>
  );
}
