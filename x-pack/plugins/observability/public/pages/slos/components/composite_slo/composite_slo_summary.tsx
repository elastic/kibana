/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiFlexItem, EuiStat } from '@elastic/eui';
import numeral from '@elastic/numeral';
import { i18n } from '@kbn/i18n';
import { CompositeSLOWithSummaryResponse } from '@kbn/slo-schema';
import React from 'react';
import { NOT_AVAILABLE_LABEL } from '../../../../../common/i18n';
import { useKibana } from '../../../../utils/kibana_react';

export interface Props {
  compositeSlo: CompositeSLOWithSummaryResponse;
}

export function CompositeSloSummary({ compositeSlo }: Props) {
  const { uiSettings } = useKibana().services;
  const percentFormat = uiSettings.get('format:percent:defaultPattern');
  const isSloFailed =
    compositeSlo.summary.status === 'VIOLATED' || compositeSlo.summary.status === 'DEGRADING';
  const titleColor = isSloFailed ? 'danger' : '';

  const errorBudgetRemaining =
    compositeSlo.summary.errorBudget.remaining <= 0
      ? Math.trunc(compositeSlo.summary.errorBudget.remaining * 100) / 100
      : compositeSlo.summary.errorBudget.remaining;

  return (
    <EuiFlexGroup direction="row" justifyContent="spaceBetween" gutterSize="l" responsive={false}>
      <EuiFlexItem grow={false} style={{ width: 200 }}>
        <EuiFlexGroup
          direction="row"
          responsive={false}
          gutterSize="s"
          alignItems="center"
          justifyContent="flexEnd"
        >
          <EuiFlexItem grow={false}>
            <EuiStat
              description={i18n.translate('xpack.observability.slo.compositeSlo.stats.objective', {
                defaultMessage: '{objective} target',
                values: { objective: numeral(compositeSlo.objective.target).format(percentFormat) },
              })}
              title={
                compositeSlo.summary.status === 'NO_DATA'
                  ? NOT_AVAILABLE_LABEL
                  : numeral(compositeSlo.summary.sliValue).format(percentFormat)
              }
              textAlign="right"
              titleColor={titleColor}
              titleSize="m"
              reverse
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>

      <EuiFlexItem grow={false} style={{ width: 220 }}>
        <EuiFlexGroup
          direction="row"
          responsive={false}
          gutterSize="s"
          alignItems="center"
          justifyContent="flexEnd"
        >
          <EuiFlexItem grow={false}>
            <EuiStat
              description={i18n.translate(
                'xpack.observability.slo.compositeSlo.stats.budgetRemaining',
                {
                  defaultMessage: 'Budget remaining',
                }
              )}
              textAlign="right"
              title={numeral(errorBudgetRemaining).format(percentFormat)}
              titleColor={titleColor}
              titleSize="m"
              reverse
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
