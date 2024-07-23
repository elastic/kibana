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
import { ALERT_EVALUATION_VALUE, ALERT_TIME_RANGE } from '@kbn/rule-data-utils';
import { GetSLOResponse } from '@kbn/slo-schema';
import React from 'react';
import { useKibana } from '../../../../../../utils/kibana_react';
import { ErrorRateChart } from '../../../../error_rate_chart';
import { TimeRange } from '../../../../error_rate_chart/use_lens_definition';
import { BurnRateAlert } from '../../types';
import { getActionGroupWindow } from '../../utils/alert';
import { getLastDurationInUnit } from '../../utils/last_duration_i18n';
import { getDataTimeRange } from '../../utils/time_range';

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
  const dataTimeRange = getDataTimeRange(alert);
  const actionGroupWindow = getActionGroupWindow(alert);
  // @ts-ignore
  const alertTimeRange = getAlertTimeRange(alert.fields[ALERT_TIME_RANGE]);
  const burnRate = alert.fields[ALERT_EVALUATION_VALUE];

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
                  {i18n.translate('xpack.slo.burnRateRule.alertDetailsAppSection.burnRate.title', {
                    defaultMessage: '{sloName} burn rate',
                    values: { sloName: slo.name },
                  })}
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
                  id="xpack.slo.burnRateRule.alertDetailsAppSection.burnRate.sloDetailsLink"
                  defaultMessage="SLO details"
                />
              </EuiLink>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiFlexItem grow={false}>
            <EuiText size="s" color="subdued">
              <span>{getLastDurationInUnit(dataTimeRange)}</span>
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
                        'xpack.slo.burnRateRule.alertDetailsAppSection.burnRate.thresholdBreachedTitle',
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
                            'xpack.slo.burnRateRule.alertDetailsAppSection.burnRate.tresholdSubtitle',
                            {
                              defaultMessage: 'Alert when > {threshold}x',
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
              showErrorRateAsLine
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexGroup>
    </EuiPanel>
  );
}
