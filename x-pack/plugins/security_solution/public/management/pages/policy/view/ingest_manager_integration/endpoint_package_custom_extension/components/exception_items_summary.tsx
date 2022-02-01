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

const StyledEuiFlexGroup = styled(EuiFlexGroup)<{
  isSmall: boolean;
}>`
  font-size: ${({ isSmall, theme }) => (isSmall ? theme.eui.euiFontSizeXS : 'inherit')};
  font-weight: ${({ isSmall }) => (isSmall ? '1px' : 'inherit')};
`;

const CSS_BOLD: Readonly<React.CSSProperties> = { fontWeight: 'bold' };

interface ExceptionItemsSummaryProps {
  stats: GetExceptionSummaryResponse | undefined;
  isSmall?: boolean;
}

export const ExceptionItemsSummary = memo<ExceptionItemsSummaryProps>(
  ({ stats, isSmall = false }) => {
    const getItem = useCallback(
      (stat: keyof GetExceptionSummaryResponse) => {
        if (stat !== 'total' && isSmall) {
          return null;
        }
        return (
          <EuiFlexItem key={stat}>
            <SummaryStat
              value={stats?.[stat] ?? 0}
              color={stat === 'total' && !isSmall ? 'primary' : 'default'}
              key={stat}
              isSmall={isSmall}
            >
              {SUMMARY_LABELS[stat]}
            </SummaryStat>
          </EuiFlexItem>
        );
      },
      [stats, isSmall]
    );

    return (
      <EuiFlexGroup
        alignItems="center"
        justifyContent={isSmall ? 'flexStart' : 'spaceAround'}
        gutterSize={isSmall ? 's' : 'l'}
      >
        {SUMMARY_KEYS.map((stat) => getItem(stat))}
      </EuiFlexGroup>
    );
  }
);

ExceptionItemsSummary.displayName = 'ExceptionItemsSummary';

const SummaryStat: FC<{ value: number; color?: EuiBadgeProps['color']; isSmall?: boolean }> = memo(
  ({ children, value, color, isSmall = false, ...commonProps }) => {
    return (
      <EuiText className="eui-displayInlineBlock" size={isSmall ? 'xs' : 's'}>
        <StyledEuiFlexGroup
          justifyContent={isSmall ? 'flexStart' : 'center'}
          direction={isSmall ? 'rowReverse' : 'row'}
          alignItems="center"
          gutterSize={isSmall ? 'xs' : 'l'}
          isSmall={isSmall}
        >
          {!isSmall ? (
            <EuiFlexItem grow={false} style={color === 'primary' ? CSS_BOLD : undefined}>
              {children}
            </EuiFlexItem>
          ) : null}
          <EuiFlexItem grow={false}>
            <EuiBadge color={color}>{value}</EuiBadge>
          </EuiFlexItem>
        </StyledEuiFlexGroup>
      </EuiText>
    );
  }
);

SummaryStat.displayName = 'SummaryState';
