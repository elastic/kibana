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
  small: boolean;
}>`
  font-size: ${({ small }) => (small ? '12px' : 'innherit')};
  font-weight: ${({ small }) => (small ? '1px' : 'innherit')};
`;

const CSS_BOLD: Readonly<React.CSSProperties> = { fontWeight: 'bold' };

interface ExceptionItemsSummaryProps {
  stats: GetExceptionSummaryResponse | undefined;
  small?: boolean;
}

export const ExceptionItemsSummary = memo<ExceptionItemsSummaryProps>(
  ({ stats, small = false }) => {
    const getItem = useCallback(
      (stat: keyof GetExceptionSummaryResponse) => (
        <EuiFlexItem key={stat}>
          <SummaryStat
            value={stats?.[stat] ?? 0}
            color={stat === 'total' ? 'primary' : 'default'}
            key={stat}
            small={small}
          >
            {SUMMARY_LABELS[stat]}
          </SummaryStat>
        </EuiFlexItem>
      ),
      [stats, small]
    );

    return (
      <EuiFlexGroup
        alignItems="center"
        justifyContent={small ? 'flexStart' : 'spaceAround'}
        gutterSize={small ? 's' : 'l'}
      >
        {SUMMARY_KEYS.map((stat) => getItem(stat))}
      </EuiFlexGroup>
    );
  }
);

ExceptionItemsSummary.displayName = 'ExceptionItemsSummary';

const SummaryStat: FC<{ value: number; color?: EuiBadgeProps['color']; small?: boolean }> = memo(
  ({ children, value, color, small = false, ...commonProps }) => {
    return (
      <EuiText className="eui-displayInlineBlock" size={small ? 'xs' : 's'}>
        <StyledEuiFlexGroup
          justifyContent={small ? 'flexStart' : 'center'}
          direction="row"
          alignItems="center"
          gutterSize={small ? 'xs' : 'l'}
          small={small}
        >
          {small ? (
            <>
              <EuiFlexItem grow={false}>
                <EuiBadge color={color}>{value}</EuiBadge>
              </EuiFlexItem>
              <EuiFlexItem grow={false} style={color === 'primary' ? CSS_BOLD : undefined}>
                {children}
              </EuiFlexItem>
            </>
          ) : (
            <>
              <EuiFlexItem grow={false} style={color === 'primary' ? CSS_BOLD : undefined}>
                {children}
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiBadge color={color}>{value}</EuiBadge>
              </EuiFlexItem>
            </>
          )}
        </StyledEuiFlexGroup>
      </EuiText>
    );
  }
);

SummaryStat.displayName = 'SummaryState';
