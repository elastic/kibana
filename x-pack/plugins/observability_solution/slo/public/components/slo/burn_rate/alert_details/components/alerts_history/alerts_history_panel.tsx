/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiLoadingChart,
  EuiLoadingSpinner,
  EuiPanel,
  EuiStat,
  EuiText,
  EuiTextColor,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useAlertsHistory } from '@kbn/observability-alert-details';
import rison from '@kbn/rison';
import { ALERT_RULE_PARAMETERS } from '@kbn/rule-data-utils';
import { GetSLOResponse } from '@kbn/slo-schema';
import moment from 'moment';
import React from 'react';
import { convertTo } from '@kbn/observability-plugin/public';
import { useKibana } from '../../../../../../utils/kibana_react';
import { WindowSchema } from '../../../../../../typings';
import { ErrorRateChart } from '../../../../error_rate_chart';
import { BurnRateAlert, BurnRateRule } from '../../alert_details_app_section';
import { getActionGroupFromReason } from '../../utils/alert';

interface Props {
  slo?: GetSLOResponse;
  alert: BurnRateAlert;
  rule: BurnRateRule;
  isLoading: boolean;
}

export function AlertsHistoryPanel({ rule, slo, alert, isLoading }: Props) {
  const {
    services: { http },
  } = useKibana();
  const { isLoading: isAlertsHistoryLoading, data } = useAlertsHistory({
    featureIds: ['slo'],
    ruleId: rule.id,
    dateRange: {
      from: 'now-30d',
      to: 'now',
    },
    http,
  });

  const actionGroup = getActionGroupFromReason(alert.reason);
  const actionGroupWindow = (
    (alert.fields[ALERT_RULE_PARAMETERS]?.windows ?? []) as WindowSchema[]
  ).find((window: WindowSchema) => window.actionGroup === actionGroup);
  const dataTimeRange = {
    from: moment().subtract(30, 'day').toDate(),
    to: new Date(),
  };

  function getAlertsLink() {
    const kuery = `kibana.alert.rule.uuid:"${rule.id}"`;
    return http.basePath.prepend(`/app/observability/alerts?_a=${rison.encode({ kuery })}`);
  }

  if (isLoading) {
    return <EuiLoadingChart size="m" mono data-test-subj="loading" />;
  }

  if (!slo) {
    return null;
  }

  return (
    <EuiPanel paddingSize="m" color="transparent" hasBorder data-test-subj="alertsHistoryPanel">
      <EuiFlexGroup direction="column" gutterSize="m">
        <EuiFlexGroup direction="column" gutterSize="none">
          <EuiFlexGroup direction="row" justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>
              <EuiTitle size="xs">
                <h2>
                  {i18n.translate(
                    'xpack.slo.burnRateRule.alertDetailsAppSection.alertsHistory.title',
                    { defaultMessage: '{sloName} alerts history', values: { sloName: slo.name } }
                  )}
                </h2>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiLink color="text" href={getAlertsLink()} data-test-subj="alertsLink">
                <EuiIcon type="sortRight" style={{ marginRight: '4px' }} />
                <FormattedMessage
                  id="xpack.slo.burnRateRule.alertDetailsAppSection.alertsHistory.alertsLink"
                  defaultMessage="View alerts"
                />
              </EuiLink>
            </EuiFlexItem>
          </EuiFlexGroup>

          <EuiFlexItem grow={false}>
            <EuiText size="s" color="subdued">
              <span>
                {i18n.translate(
                  'xpack.slo.burnRateRule.alertDetailsAppSection.alertsHistory.subtitle',
                  {
                    defaultMessage: 'Last 30 days',
                  }
                )}
              </span>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiFlexGroup direction="row" gutterSize="m" justifyContent="flexStart">
          <EuiFlexItem grow={false}>
            <EuiStat
              title={
                isAlertsHistoryLoading ? (
                  <EuiLoadingSpinner size="s" />
                ) : data.totalTriggeredAlerts ? (
                  data.totalTriggeredAlerts
                ) : (
                  '-'
                )
              }
              titleColor="danger"
              titleSize="m"
              textAlign="left"
              isLoading={isLoading}
              data-test-subj="alertsTriggeredStats"
              reverse
              description={
                <EuiTextColor color="default">
                  <span>
                    {i18n.translate(
                      'xpack.slo.burnRateRule.alertDetailsAppSection.alertsHistory.triggeredAlertsStatsTitle',
                      { defaultMessage: 'Alerts triggered' }
                    )}
                  </span>
                </EuiTextColor>
              }
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiStat
              title={
                isAlertsHistoryLoading ? (
                  <EuiLoadingSpinner size="s" />
                ) : data.avgTimeToRecoverUS ? (
                  convertTo({
                    unit: 'minutes',
                    microseconds: data.avgTimeToRecoverUS,
                    extended: true,
                  }).formatted
                ) : (
                  '-'
                )
              }
              titleColor="default"
              titleSize="m"
              textAlign="left"
              isLoading={isLoading}
              data-test-subj="avgTimeToRecoverStat"
              reverse
              description={
                <EuiTextColor color="default">
                  <span>
                    {i18n.translate(
                      'xpack.slo.burnRateRule.alertDetailsAppSection.alertsHistory.avgTimeToRecoverStatsTitle',
                      { defaultMessage: 'Avg time to recover' }
                    )}
                  </span>
                </EuiTextColor>
              }
            />
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiFlexGroup direction="row" gutterSize="m" justifyContent="flexStart">
          <EuiFlexItem>
            {isAlertsHistoryLoading ? (
              <EuiLoadingSpinner size="s" />
            ) : (
              <ErrorRateChart
                slo={slo}
                dataTimeRange={dataTimeRange}
                threshold={actionGroupWindow!.burnRateThreshold}
                annotations={data.histogramTriggeredAlerts
                  .filter((a) => a.doc_count > 0)
                  .map((a) => ({
                    date: new Date(a.key_as_string!),
                    total: a.doc_count,
                  }))}
                showErrorRateAsLine
              />
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexGroup>
    </EuiPanel>
  );
}
