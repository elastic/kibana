/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiPanel } from '@elastic/eui';
import numeral from '@elastic/numeral';
import { i18n } from '@kbn/i18n';
import { SLOWithSummaryResponse } from '@kbn/slo-schema';
import { assertNever } from '@kbn/std';
import moment from 'moment';
import React from 'react';

import { toI18nDuration } from '../../../utils/slo/duration';
import { useKibana } from '../../../utils/kibana_react';
import { OverviewItem } from './overview_item';

export interface Props {
  slo: SLOWithSummaryResponse;
}

export function Overview({ slo }: Props) {
  const { uiSettings } = useKibana().services;
  const dateFormat = uiSettings.get('dateFormat');
  const percentFormat = uiSettings.get('format:percent:defaultPattern');
  const hasNoData = slo.summary.status === 'NO_DATA';

  return (
    <EuiPanel paddingSize="none" color="transparent" data-test-subj="overview">
      <EuiFlexGroup direction="column" gutterSize="l">
        <EuiFlexGroup direction="row" alignItems="flexStart">
          <OverviewItem
            title={i18n.translate(
              'xpack.observability.slo.sloDetails.overview.observedValueTitle',
              {
                defaultMessage: 'Observed value',
              }
            )}
            subtitle={i18n.translate(
              'xpack.observability.slo.sloDetails.overview.observedValueSubtitle',
              {
                defaultMessage: '{value} (objective is {objective})',
                values: {
                  value: hasNoData ? '-' : numeral(slo.summary.sliValue).format(percentFormat),
                  objective: numeral(slo.objective.target).format(percentFormat),
                },
              }
            )}
          />
          <OverviewItem
            title={i18n.translate(
              'xpack.observability.slo.sloDetails.overview.indicatorTypeTitle',
              {
                defaultMessage: 'Indicator type',
              }
            )}
            subtitle={toIndicatorTypeLabel(slo.indicator.type)}
          />
          <OverviewItem
            title={i18n.translate('xpack.observability.slo.sloDetails.overview.timeWindowTitle', {
              defaultMessage: 'Time window',
            })}
            subtitle={toTimeWindowLabel(slo.timeWindow)}
          />
          <OverviewItem
            title={i18n.translate(
              'xpack.observability.slo.sloDetails.overview.budgetingMethodTitle',
              {
                defaultMessage: 'Budgeting method',
              }
            )}
            subtitle={toBudgetingMethod(slo.budgetingMethod)}
          />
        </EuiFlexGroup>

        <EuiFlexGroup direction="row" alignItems="flexStart">
          <OverviewItem
            title={i18n.translate('xpack.observability.slo.sloDetails.overview.descriptionTitle', {
              defaultMessage: 'Description',
            })}
            subtitle={!!slo.description ? slo.description : '-'}
          />
          <OverviewItem
            title={i18n.translate('xpack.observability.slo.sloDetails.overview.createdAtTitle', {
              defaultMessage: 'Created at',
            })}
            subtitle={moment(slo.createdAt).format(dateFormat)}
          />
          <OverviewItem
            title={i18n.translate('xpack.observability.slo.sloDetails.overview.updatedAtTitle', {
              defaultMessage: 'Last update at',
            })}
            subtitle={moment(slo.updatedAt).format(dateFormat)}
          />
          <OverviewItem
            title={i18n.translate('xpack.observability.slo.sloDetails.overview.tagsTitle', {
              defaultMessage: 'Tags',
            })}
            subtitle="-"
          />
        </EuiFlexGroup>
      </EuiFlexGroup>
    </EuiPanel>
  );
}

function toTimeWindowLabel(timeWindow: SLOWithSummaryResponse['timeWindow']): string {
  if ('isRolling' in timeWindow) {
    return i18n.translate('xpack.observability.slo.sloDetails.overview.rollingTimeWindow', {
      defaultMessage: '{duration} rolling',
      values: {
        duration: toI18nDuration(timeWindow.duration),
      },
    });
  }

  return i18n.translate('xpack.observability.slo.sloDetails.overview.calendarAlignedTimeWindow', {
    defaultMessage: '{duration}',
    values: {
      duration: timeWindow.duration,
    },
  });
}

function toIndicatorTypeLabel(indicatorType: SLOWithSummaryResponse['indicator']['type']): string {
  switch (indicatorType) {
    case 'sli.kql.custom':
      return i18n.translate('xpack.observability.slo.sloDetails.overview.customKqlIndicator', {
        defaultMessage: 'Custom KQL',
      });

    case 'sli.apm.transactionDuration':
      return i18n.translate('xpack.observability.slo.sloDetails.overview.apmLatencyIndicator', {
        defaultMessage: 'APM latency',
      });

    case 'sli.apm.transactionErrorRate':
      return i18n.translate(
        'xpack.observability.slo.sloDetails.overview.apmAvailabilityIndicator',
        {
          defaultMessage: 'APM availability',
        }
      );
    default:
      assertNever(indicatorType);
  }
}

function toBudgetingMethod(budgetingMethod: SLOWithSummaryResponse['budgetingMethod']): string {
  if (budgetingMethod === 'occurrences') {
    return i18n.translate(
      'xpack.observability.slo.sloDetails.overview.occurrencesBudgetingMethod',
      { defaultMessage: 'Occurrences' }
    );
  }

  return i18n.translate('xpack.observability.slo.sloDetails.overview.timeslicesBudgetingMethod', {
    defaultMessage: 'Timeslices',
  });
}
