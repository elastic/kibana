/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, memo, useCallback } from 'react';
import { EuiBadge, EuiBadgeProps, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import styled from 'styled-components';
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

export const StyledEuiFlexGridGroup = styled(EuiFlexGroup)`
  display: grid;
  min-width: 240px;
  grid-template-columns: 50% 50%;
`;

const CSS_BOLD: Readonly<React.CSSProperties> = { fontWeight: 'bold' };

interface ExceptionItemsSummaryProps {
  stats: GetExceptionSummaryResponse | undefined;
  multiRow?: boolean;
}

export const ExceptionItemsSummary = memo<ExceptionItemsSummaryProps>(
  ({ stats, multiRow = false }) => {
    const getItem = useCallback(
      (stat: keyof GetExceptionSummaryResponse) => (
        <EuiFlexItem key={stat}>
          <SummaryStat
            value={stats?.[stat] ?? 0}
            color={stat === 'total' ? 'primary' : 'default'}
            key={stat}
            multiRow
          >
            {SUMMARY_LABELS[stat]}
          </SummaryStat>
        </EuiFlexItem>
      ),
      [stats]
    );
    if (multiRow) {
      return (
        <>
          <StyledEuiFlexGridGroup alignItems="center" justifyContent="flexEnd">
            {SUMMARY_KEYS.slice(0, 2).map((stat) => getItem(stat))}
          </StyledEuiFlexGridGroup>
          <StyledEuiFlexGridGroup alignItems="center" justifyContent="flexEnd">
            {SUMMARY_KEYS.slice(2, 4).map((stat) => getItem(stat))}
          </StyledEuiFlexGridGroup>
        </>
      );
    } else {
      return (
        <EuiFlexGroup alignItems="center" justifyContent="spaceAround">
          {SUMMARY_KEYS.map((stat) => getItem(stat))}
        </EuiFlexGroup>
      );
    }
  }
);

ExceptionItemsSummary.displayName = 'ExceptionItemsSummary';

const SummaryStat: FC<{ value: number; color?: EuiBadgeProps['color']; multiRow?: boolean }> = memo(
  ({ children, value, color, multiRow = false, ...commonProps }) => {
    return (
      <EuiText className="eui-displayInlineBlock" size="s">
        <EuiFlexGroup
          justifyContent={multiRow ? 'flexEnd' : 'center'}
          direction="row"
          alignItems="center"
        >
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
