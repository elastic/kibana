/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';
import { css } from '@emotion/react';
import {
  EuiHealth,
  EuiBadge,
  EuiTextColor,
  EuiSpacer,
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
}

const formatNumber = (value: number) => (value < 1000 ? value : numeral(value).format('0.0a'));

export const FindingsDistributionBar = ({ failed, passed, total, pageEnd, pageStart }: Props) => {
  const count = useMemo(
    () =>
      total
        ? { total, passed: passed / total, failed: failed / total }
        : { total: 0, passed: 0, failed: 0 },
    [total, failed, passed]
  );

  return (
    <div>
      <Counters {...{ failed, passed, total, pageEnd, pageStart }} />
      <EuiSpacer size="s" />
      <DistributionBar {...count} />
    </div>
  );
};

const Counters = ({ pageStart, pageEnd, total, failed, passed }: Props) => (
  <EuiFlexGroup justifyContent="spaceBetween">
    <EuiFlexItem>
      {!!total && <CurrentPageOfTotal pageStart={pageStart} pageEnd={pageEnd} total={total} />}
    </EuiFlexItem>
    <EuiFlexItem
      css={css`
        align-items: flex-end;
      `}
    >
      {!!total && <PassedFailedCounters passed={passed} failed={failed} />}
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
          defaultMessage: 'Passed',
        })}
        color={euiTheme.colors.success}
        value={passed}
      />
      <Counter
        label={i18n.translate('xpack.csp.findings.distributionBar.totalFailedLabel', {
          defaultMessage: 'Failed',
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
}: Pick<Props, 'pageEnd' | 'pageStart' | 'total'>) => (
  <EuiTextColor color="subdued">
    <FormattedMessage
      id="xpack.csp.findings.distributionBar.showingPageOfTotalLabel"
      defaultMessage="Showing {pageStart}-{pageEnd} of {total} Findings"
      values={{
        pageStart: <b>{pageStart}</b>,
        pageEnd: <b>{pageEnd}</b>,
        total: <b>{formatNumber(total)}</b>,
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
        background: ${euiTheme.colors.subdued};
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
    <EuiFlexItem>
      <EuiHealth color={color}>{label}</EuiHealth>
    </EuiFlexItem>
    <EuiFlexItem>
      <EuiBadge>{formatNumber(value)}</EuiBadge>
    </EuiFlexItem>
  </EuiFlexGroup>
);
