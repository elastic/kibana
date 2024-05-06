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
  EuiFlexGroup,
  EuiFlexItem,
  useEuiTheme,
  EuiTextColor,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { getAbbreviatedNumber } from '../../../common/utils/get_abbreviated_number';
import { RULE_FAILED, RULE_PASSED } from '../../../../common/constants';
import { statusColors } from '../../../common/constants';
import type { Evaluation } from '../../../../common/types_old';

interface Props {
  passed: number;
  failed: number;
  distributionOnClick: (evaluation: Evaluation) => void;
}

export const CurrentPageOfTotal = ({
  pageEnd,
  pageStart,
  total,
  type,
}: {
  pageEnd: number;
  pageStart: number;
  total: number;
  type: string;
}) => (
  <EuiTextColor color="subdued">
    <FormattedMessage
      id="xpack.csp.findings.distributionBar.showingPageOfTotalLabel"
      defaultMessage="Showing {pageStart}-{pageEnd} of {total} {type}"
      values={{
        pageStart: <b>{pageStart}</b>,
        pageEnd: <b>{pageEnd}</b>,
        total: <b>{getAbbreviatedNumber(total)}</b>,
        type,
      }}
    />
  </EuiTextColor>
);

export const FindingsDistributionBar = (props: Props) => (
  <div>
    <Counters {...props} />
    <EuiSpacer size="s" />
    <DistributionBar {...props} />
  </div>
);

const Counters = (props: Props) => (
  <EuiFlexGroup justifyContent="flexEnd">
    <EuiFlexItem>
      <EuiFlexGroup justifyContent="flexEnd">
        <PassedFailedCounters {...props} />
      </EuiFlexGroup>
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
        color={statusColors.passed}
        value={passed}
      />
      <Counter
        label={i18n.translate('xpack.csp.findings.distributionBar.totalFailedLabel', {
          defaultMessage: 'Failed Findings',
        })}
        color={statusColors.failed}
        value={failed}
      />
    </div>
  );
};

const DistributionBar: React.FC<Omit<Props, 'pageEnd' | 'pageStart'>> = ({
  passed,
  failed,
  distributionOnClick,
}) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiFlexGroup
      gutterSize="none"
      css={css`
        height: 8px;
        background: ${euiTheme.colors.lightestShade};
      `}
    >
      <DistributionBarPart
        value={passed}
        color={statusColors.passed}
        distributionOnClick={() => {
          distributionOnClick(RULE_PASSED);
        }}
        data-test-subj="distribution_bar_passed"
      />
      <DistributionBarPart
        value={failed}
        color={statusColors.failed}
        distributionOnClick={() => {
          distributionOnClick(RULE_FAILED);
        }}
        data-test-subj="distribution_bar_failed"
      />
    </EuiFlexGroup>
  );
};

const DistributionBarPart = ({
  value,
  color,
  distributionOnClick,
  ...rest
}: {
  value: number;
  color: string;
  distributionOnClick: () => void;
  ['data-test-subj']: string;
}) => (
  <button
    data-test-subj={rest['data-test-subj']}
    onClick={distributionOnClick}
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
      <EuiBadge>{getAbbreviatedNumber(value)}</EuiBadge>
    </EuiFlexItem>
  </EuiFlexGroup>
);
