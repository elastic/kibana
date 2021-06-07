/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, EuiBadgeProps, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import React, { FC, memo } from 'react';
import { i18n } from '@kbn/i18n';
import { GetExceptionSummaryResponse } from '../../../../../../../../common/endpoint/types';

const SUMMARY_KEYS: Readonly<Array<keyof GetExceptionSummaryResponse>> = [
  'windows',
  'macos',
  'linux',
  'total',
];

const SUMMARY_LABELS: Readonly<{ [key in keyof GetExceptionSummaryResponse]: string }> = {
  windows: i18n.translate(
    'xpack.securitySolution.endpoint.fleetCustomExtension.exceptionItemsSummary.windows',
    { defaultMessage: 'Windows' }
  ),
  linux: i18n.translate(
    'xpack.securitySolution.endpoint.fleetCustomExtension.exceptionItemsSummary.linux',
    { defaultMessage: 'Linux' }
  ),
  macos: i18n.translate(
    'xpack.securitySolution.endpoint.fleetCustomExtension.exceptionItemsSummary.macos',
    { defaultMessage: 'Mac' }
  ),
  total: i18n.translate(
    'xpack.securitySolution.endpoint.fleetCustomExtension.exceptionItemsSummary.total',
    { defaultMessage: 'Total' }
  ),
};

const CSS_BOLD: Readonly<React.CSSProperties> = { fontWeight: 'bold' };

interface ExceptionItemsSummaryProps {
  stats: GetExceptionSummaryResponse | undefined;
}

export const ExceptionItemsSummary = memo<ExceptionItemsSummaryProps>(({ stats }) => {
  return (
    <EuiFlexGroup alignItems="center" justifyContent="spaceAround">
      {SUMMARY_KEYS.map((stat) => {
        return (
          <EuiFlexItem key={stat}>
            <SummaryStat
              value={stats?.[stat] ?? 0}
              color={stat === 'total' ? 'primary' : 'default'}
              key={stat}
            >
              {SUMMARY_LABELS[stat]}
            </SummaryStat>
          </EuiFlexItem>
        );
      })}
    </EuiFlexGroup>
  );
});

ExceptionItemsSummary.displayName = 'ExceptionItemsSummary';

const SummaryStat: FC<{ value: number; color?: EuiBadgeProps['color'] }> = memo(
  ({ children, value, color, ...commonProps }) => {
    return (
      <EuiText className="eui-displayInlineBlock" size="s">
        <EuiFlexGroup justifyContent="center" direction="row" alignItems="center">
          <EuiFlexItem grow={false} style={color === 'primary' ? CSS_BOLD : undefined}>
            {children}
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiBadge color={color}>{value}</EuiBadge>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiText>
    );
  }
);

SummaryStat.displayName = 'SummaryState';
