/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiPanel } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { SLOWithSummaryResponse } from '@kbn/slo-schema';
import { assertNever } from '@kbn/std';
import React from 'react';

import { OverviewItem } from './overview_item';

export interface Props {
  slo: SLOWithSummaryResponse;
}

export function Overview({ slo }: Props) {
  return (
    <EuiPanel paddingSize="none" color="transparent">
      <EuiFlexGroup direction="row">
        <OverviewItem
          title={i18n.translate('xpack.observability.slo.sloDetails.overview.observedValueTitle', {
            defaultMessage: 'Observed value',
          })}
          subtitle={i18n.translate(
            'xpack.observability.slo.sloDetails.overview.observedValueSubtitle',
            {
              defaultMessage: '{value} (target is {objective})',
              values: {
                value: toPercentage(slo.summary.sliValue),
                objective: toPercentage(slo.objective.target),
              },
            }
          )}
        />
        <OverviewItem
          title={i18n.translate('xpack.observability.slo.sloDetails.overview.indicatorTypeTitle', {
            defaultMessage: 'Indicator type',
          })}
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
    </EuiPanel>
  );
}

function toTimeWindowLabel(timeWindow: SLOWithSummaryResponse['timeWindow']): string {
  if ('isRolling' in timeWindow) {
    return i18n.translate('xpack.observability.slo.sloDetails.overview.rollingTimeWindow', {
      defaultMessage: '{duration} rolling',
      values: {
        duration: timeWindow.duration,
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

function toPercentage(value: number): string {
  return `${Math.trunc(value * 100000) / 1000}%`;
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
