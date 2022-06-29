/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { css } from '@emotion/react';
import {
  EuiHealth,
  EuiBadge,
  EuiSpacer,
  EuiTextColor,
  EuiFlexGroup,
  EuiFlexItem,
  useEuiTheme,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import numeral from '@elastic/numeral';

interface Props {
  total: number;
  passed: number;
  failed: number;
  pageStart: number;
  pageEnd: number;
  type: string;
}

const formatNumber = (value: number) => (value < 1000 ? value : numeral(value).format('0.0a'));

export const FindingsDistributionBar = (props: Props) => (
  <div>
    <Counters {...props} />
    <EuiSpacer size="s" />
    {<DistributionBar {...props} />}
  </div>
);

const Counters = (props: Props) => (
  <EuiFlexGroup justifyContent="spaceBetween">
    <EuiFlexItem>
      <CurrentPageOfTotal {...props} />
    </EuiFlexItem>
    <EuiFlexItem
      grow={1}
      css={css`
        align-items: flex-end;
      `}
    >
      <PassedFailedCounters {...props} />
    </EuiFlexItem>
  </EuiFlexGroup>
);

const PassedFailedCounters = ({ passed, failed }: Pick<Props, 'passed' | 'failed'>) => {
  const { euiTheme } = useEuiTheme();
  return (
    <div
      css={css`
        display: grid;
        grid-template-columns: auto auto;
        grid-column-gap: ${euiTheme.size.m};
      `}
    >
      <Counter
        label={i18n.translate('xpack.csp.findings.distributionBar.totalPassedLabel', {
          defaultMessage: 'Passed Findings',
        })}
        color={euiTheme.colors.success}
        value={passed}
      />
      <Counter
        label={i18n.translate('xpack.csp.findings.distributionBar.totalFailedLabel', {
          defaultMessage: 'Failed Findings',
        })}
        color={euiTheme.colors.danger}
        value={failed}
      />
    </div>
  );
};

const CurrentPageOfTotal = ({
  pageEnd,
  pageStart,
  total,
  type,
}: Pick<Props, 'pageEnd' | 'pageStart' | 'total' | 'type'>) => (
  <EuiTextColor color="subdued">
    <FormattedMessage
      id="xpack.csp.findings.distributionBar.showingPageOfTotalLabel"
      defaultMessage="Showing {pageStart}-{pageEnd} of {total} {type}"
      values={{
        pageStart: <b>{pageStart}</b>,
        pageEnd: <b>{pageEnd}</b>,
        total: <b>{formatNumber(total)}</b>,
        type,
      }}
    />
  </EuiTextColor>
);

const DistributionBar: React.FC<Omit<Props, 'pageEnd' | 'pageStart'>> = ({ passed, failed }) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiFlexGroup
      gutterSize="none"
      css={css`
        height: 8px;
        background: ${euiTheme.colors.subduedText};
      `}
    >
      <DistributionBarPart value={passed} color={euiTheme.colors.success} />
      <DistributionBarPart value={failed} color={euiTheme.colors.danger} />
    </EuiFlexGroup>
  );
};

const DistributionBarPart = ({ value, color }: { value: number; color: string }) => (
  <div
    css={css`
      flex: ${value};
      background: ${color};
      height: 100%;
    `}
  />
);

const Counter = ({ label, value, color }: { label: string; value: number; color: string }) => (
  <EuiFlexGroup gutterSize="s" alignItems="center">
    <EuiFlexItem grow={1}>
      <EuiHealth color={color}>{label}</EuiHealth>
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiBadge>{formatNumber(value)}</EuiBadge>
    </EuiFlexItem>
  </EuiFlexGroup>
);
