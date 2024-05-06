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
            content={i18n.translate('xpack.slo.sloStatusBadge.noDataTooltip', {
              defaultMessage: 'It may take some time before the data is aggregated and available.',
            })}
          >
            <EuiBadge color="default">
              {i18n.translate('xpack.slo.sloStatusBadge.noData', {
                defaultMessage: 'No data',
              })}
            </EuiBadge>
          </EuiToolTip>
        )}
        {slo.summary.status === 'HEALTHY' && (
          <div>
            <EuiBadge color="success">
              {i18n.translate('xpack.slo.sloStatusBadge.healthy', {
                defaultMessage: 'Healthy',
              })}
            </EuiBadge>
          </div>
        )}
        {slo.summary.status === 'DEGRADING' && (
          <div>
            <EuiBadge color="warning">
              {i18n.translate('xpack.slo.sloStatusBadge.degrading', {
                defaultMessage: 'Degrading',
              })}
            </EuiBadge>
          </div>
        )}
        {slo.summary.status === 'VIOLATED' && (
          <div>
            <EuiBadge color="danger">
              {i18n.translate('xpack.slo.sloStatusBadge.violated', {
                defaultMessage: 'Violated',
              })}
            </EuiBadge>
          </div>
        )}
      </EuiFlexItem>

      {slo.summary.errorBudget.isEstimated && (
        <EuiFlexItem grow={false}>
          {/* Prevent badges from growing when inside an EuiFlexGroup by wrapping content with div */}
          <div>
            <EuiBadge color="default">
              {i18n.translate('xpack.slo.sloStatusBadge.forecasted', {
                defaultMessage: 'Forecasted',
              })}
            </EuiBadge>
          </div>
        </EuiFlexItem>
      )}
    </>
  );
}
