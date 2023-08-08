/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiFlexItem, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { SLOWithSummaryResponse } from '@kbn/slo-schema';

export interface SloStatusProps {
  slo: SLOWithSummaryResponse;
}

export function SloStatusBadge({ slo }: SloStatusProps) {
  return (
    <>
      <EuiFlexItem grow={false}>
        {slo.summary.status === 'NO_DATA' && (
          <EuiToolTip
            position="top"
            content={i18n.translate('xpack.observability.slo.sloStatusBadge.noDataTooltip', {
              defaultMessage: 'It may take some time before the data is aggregated and available.',
            })}
          >
            <EuiBadge color="default">
              {i18n.translate('xpack.observability.slo.sloStatusBadge.noData', {
                defaultMessage: 'No data',
              })}
            </EuiBadge>
          </EuiToolTip>
        )}

        {slo.summary.status === 'HEALTHY' && (
          <EuiBadge color="success">
            {i18n.translate('xpack.observability.slo.sloStatusBadge.healthy', {
              defaultMessage: 'Healthy',
            })}
          </EuiBadge>
        )}

        {slo.summary.status === 'DEGRADING' && (
          <EuiBadge color="warning">
            {i18n.translate('xpack.observability.slo.sloStatusBadge.degrading', {
              defaultMessage: 'Degrading',
            })}
          </EuiBadge>
        )}

        {slo.summary.status === 'VIOLATED' && (
          <EuiBadge color="danger">
            {i18n.translate('xpack.observability.slo.sloStatusBadge.violated', {
              defaultMessage: 'Violated',
            })}
          </EuiBadge>
        )}
      </EuiFlexItem>

      {slo.summary.errorBudget.isEstimated && (
        <EuiFlexItem grow={false}>
          <EuiBadge color="default">
            {i18n.translate('xpack.observability.slo.sloStatusBadge.forecasted', {
              defaultMessage: 'Forecasted',
            })}
          </EuiBadge>
        </EuiFlexItem>
      )}
    </>
  );
}
