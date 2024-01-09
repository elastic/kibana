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
  EuiPanel,
  EuiStat,
  EuiText,
  EuiTextColor,
  EuiTitle,
} from '@elastic/eui';
import numeral from '@elastic/numeral';
import { Rule } from '@kbn/alerting-plugin/common';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { AlertSummaryField } from '@kbn/observability-plugin/public/pages/alert_details/components/alert_summary';
import { TopAlert } from '@kbn/observability-plugin/public/typings/alerts';
import {
  ActionGroup,
  BurnRateRuleParams,
  WindowSchema,
} from '@kbn/observability-plugin/public/typings/slo';
import { ALERT_RULE_PARAMETERS, ALERT_TIME_RANGE } from '@kbn/rule-data-utils';
import React, { useEffect } from 'react';
import { useFetchSloDetails } from '../../../../hooks/slo/use_fetch_slo_details';
import { useKibana } from '../../../../utils/kibana_react';
import { ErrorRateChart } from '../../error_rate_chart';

export type BurnRateRule = Rule<BurnRateRuleParams>;
export type BurnRateAlert = TopAlert;

interface AppSectionProps {
  alert: BurnRateAlert;
  rule: BurnRateRule;
  ruleLink: string;
  setAlertSummaryFields: React.Dispatch<React.SetStateAction<AlertSummaryField[] | undefined>>;
}

function getActionGroupFromReason(reason: string): ActionGroup {
  const prefix = reason.split(':')[0]?.toLowerCase() ?? undefined;
  switch (prefix) {
    case 'critical':
      return 'slo.burnRate.alert';
    case 'high':
      return 'slo.burnRate.high';
    case 'medium':
      return 'slo.burnRate.medium';
    case 'low':
    default:
      return 'slo.burnRate.low';
  }
}

function getAlertTimeRange(timeRange: { gte: string; lte?: string }) {
  return {
    from: new Date(timeRange.gte),
    to: timeRange.lte ? new Date(timeRange.lte) : new Date(),
  };
}

// eslint-disable-next-line import/no-default-export
export default function AlertDetailsAppSection({
  alert,
  rule,
  ruleLink,
  setAlertSummaryFields,
}: AppSectionProps) {
  const {
    services: { http },
  } = useKibana();

  const sloId = alert.fields['kibana.alert.rule.parameters']!.sloId as string;
  const instanceId = alert.fields['kibana.alert.instance.id']!;
  const { isLoading, data: slo } = useFetchSloDetails({ sloId, instanceId });

  const actionGroup = getActionGroupFromReason(alert.reason);
  const actionGroupWindow = (
    (alert.fields[ALERT_RULE_PARAMETERS]?.windows ?? []) as WindowSchema[]
  ).find((window: WindowSchema) => window.actionGroup === actionGroup);

  // @ts-ignore
  const alertTimeRange = getAlertTimeRange(alert.fields[ALERT_TIME_RANGE]);
  const threshold = alert.fields['kibana.alert.evaluation.value'];

  useEffect(() => {
    setAlertSummaryFields([
      {
        label: i18n.translate(
          'xpack.observability.slo.burnRateRule.alertDetailsAppSection.summaryField.slo',
          {
            defaultMessage: 'Source SLO',
          }
        ),
        value: (
          <EuiLink data-test-subj="sloLink" href={http.basePath.prepend(alert.link!)}>
            {slo?.name ?? '-'}
          </EuiLink>
        ),
      },
      {
        label: i18n.translate(
          'xpack.observability.slo.burnRateRule.alertDetailsAppSection.summaryField.rule',
          {
            defaultMessage: 'Rule',
          }
        ),
        value: (
          <EuiLink data-test-subj="ruleLink" href={ruleLink}>
            {rule.name}
          </EuiLink>
        ),
      },
    ]);
  }, [alert, rule, ruleLink, setAlertSummaryFields, slo]);

  if (isLoading) {
    return <EuiLoadingChart size="m" mono data-test-subj="loading" />;
  }

  if (!slo) {
    return null;
  }

  return (
    <EuiFlexGroup direction="column" data-test-subj="overviewSection">
      <EuiPanel paddingSize="m" color="transparent" hasBorder data-test-subj="burnRatePanel">
        <EuiFlexGroup direction="column" gutterSize="m">
          <EuiFlexGroup direction="column" gutterSize="none">
            <EuiFlexGroup direction="row" justifyContent="spaceBetween">
              <EuiFlexItem grow={false}>
                <EuiTitle size="xs">
                  <h2>
                    {i18n.translate(
                      'xpack.observability.slo.burnRateRule.alertDetailsAppSection.burnRate.title',
                      { defaultMessage: 'Burn rate' }
                    )}
                  </h2>
                </EuiTitle>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiLink href={http.basePath.prepend(alert.link!)}>
                  <EuiIcon type="sortRight" />
                  <FormattedMessage
                    id="xpack.observability.slo.burnRateRule.alertDetailsAppSection.burnRate.sloDetailsLink"
                    defaultMessage="SLO details"
                  />
                </EuiLink>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexGroup>
          <EuiFlexGroup direction="row" gutterSize="m">
            <EuiFlexItem grow={1}>
              <EuiPanel color="danger" hasShadow={false} paddingSize="s" grow={false}>
                <EuiFlexGroup
                  justifyContent="spaceBetween"
                  direction="column"
                  style={{ minHeight: '100%' }}
                >
                  <EuiFlexItem>
                    <EuiText color="default" size="m">
                      <span>
                        {i18n.translate(
                          'xpack.observability.slo.burnRateRule.alertDetailsAppSection.burnRate.thresholdBreachedTitle',
                          { defaultMessage: 'Threshold breached' }
                        )}
                      </span>
                    </EuiText>
                  </EuiFlexItem>

                  <EuiFlexItem>
                    <EuiStat
                      title={`${numeral(threshold).format('0.[00]')}x`}
                      titleColor="default"
                      titleSize="s"
                      textAlign="right"
                      isLoading={isLoading}
                      data-test-subj="burnRateStat"
                      description={
                        <EuiTextColor color="default">
                          <span>
                            {i18n.translate(
                              'xpack.observability.slo.burnRateRule.alertDetailsAppSection.burnRate.tresholdSubtitle',
                              {
                                defaultMessage: 'Alert when >{threshold}x',
                                values: {
                                  threshold: numeral(actionGroupWindow!.burnRateThreshold).format(
                                    '0.[00]'
                                  ),
                                },
                              }
                            )}
                          </span>
                        </EuiTextColor>
                      }
                    />
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiPanel>
            </EuiFlexItem>
            <EuiFlexItem grow={5}>
              <ErrorRateChart
                slo={slo}
                fromRange={alertTimeRange.from}
                toRange={alertTimeRange.to}
                threshold={actionGroupWindow!.burnRateThreshold}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexGroup>
      </EuiPanel>
    </EuiFlexGroup>
  );
}
