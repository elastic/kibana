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
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { ALERT_RULE_PARAMETERS, ALERT_TIME_RANGE } from '@kbn/rule-data-utils';
import { GetSLOResponse } from '@kbn/slo-schema';
import moment from 'moment';
import React from 'react';
import {
  ALERT_ACTION_ID,
  HIGH_PRIORITY_ACTION_ID,
  LOW_PRIORITY_ACTION_ID,
  MEDIUM_PRIORITY_ACTION_ID,
} from '../../../../../../../common/constants';
import { WindowSchema } from '../../../../../../typings';
import { useKibana } from '../../../../../../utils/kibana_react';
import { ErrorRateChart } from '../../../../error_rate_chart';
import { BurnRateAlert } from '../../alert_details_app_section';

function getActionGroupFromReason(reason: string): string {
  const prefix = reason.split(':')[0]?.toLowerCase() ?? undefined;
  switch (prefix) {
    case 'critical':
      return ALERT_ACTION_ID;
    case 'high':
      return HIGH_PRIORITY_ACTION_ID;
    case 'medium':
      return MEDIUM_PRIORITY_ACTION_ID;
    case 'low':
    default:
      return LOW_PRIORITY_ACTION_ID;
  }
}

interface TimeRange {
  from: Date;
  to: Date;
}

function getDataTimeRange(
  timeRange: { gte: string; lte?: string },
  window: WindowSchema
): TimeRange {
  const windowDurationInMs = window.longWindow.value * 60 * 60 * 1000;
  return {
    from: new Date(new Date(timeRange.gte).getTime() - windowDurationInMs),
    to: timeRange.lte ? new Date(timeRange.lte) : new Date(),
  };
}

function getAlertTimeRange(timeRange: { gte: string; lte?: string }): TimeRange {
  return {
    from: new Date(timeRange.gte),
    to: timeRange.lte ? new Date(timeRange.lte) : new Date(),
  };
}

interface Props {
  alert: BurnRateAlert;
  slo?: GetSLOResponse;
  isLoading: boolean;
}

export function ErrorRatePanel({ alert, slo, isLoading }: Props) {
  const {
    services: { http },
  } = useKibana();

  const actionGroup = getActionGroupFromReason(alert.reason);
  const actionGroupWindow = (
    (alert.fields[ALERT_RULE_PARAMETERS]?.windows ?? []) as WindowSchema[]
  ).find((window: WindowSchema) => window.actionGroup === actionGroup);

  // @ts-ignore
  const dataTimeRange = getDataTimeRange(alert.fields[ALERT_TIME_RANGE], actionGroupWindow);
  // @ts-ignore
  const alertTimeRange = getAlertTimeRange(alert.fields[ALERT_TIME_RANGE]);
  const burnRate = alert.fields['kibana.alert.evaluation.value'];

  if (isLoading) {
    return <EuiLoadingChart size="m" mono data-test-subj="loading" />;
  }

  if (!slo) {
    return null;
  }

  return (
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
              <EuiLink
                color="text"
                data-test-subj="o11yErrorRatePanelSloDetailsLink"
                href={http.basePath.prepend(alert.link!)}
              >
                <EuiIcon type="sortRight" style={{ marginRight: '4px' }} />
                <FormattedMessage
                  id="xpack.observability.slo.burnRateRule.alertDetailsAppSection.burnRate.sloDetailsLink"
                  defaultMessage="SLO details"
                />
              </EuiLink>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiFlexItem grow={false}>
            <EuiText size="xs">
              <span>
                {i18n.translate(
                  'xpack.observability.slo.burnRateRule.alertDetailsAppSection.burnRate.subtitle',
                  {
                    defaultMessage: 'Last {duration} hours',
                    values: {
                      duration: Math.round(
                        moment
                          .duration(moment(alertTimeRange.to).diff(alertTimeRange.from))
                          .asHours()
                      ),
                    },
                  }
                )}
              </span>
            </EuiText>
          </EuiFlexItem>
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
                      <EuiIcon type="warning" style={{ marginLeft: '4px' }} />
                    </span>
                  </EuiText>
                </EuiFlexItem>

                <EuiFlexItem>
                  <EuiStat
                    title={`${numeral(burnRate).format('0.[00]')}x`}
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
              dataTimeRange={dataTimeRange}
              alertTimeRange={alertTimeRange}
              threshold={actionGroupWindow!.burnRateThreshold}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexGroup>
    </EuiPanel>
  );
}
