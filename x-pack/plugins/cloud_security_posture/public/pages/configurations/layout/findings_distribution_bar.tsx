/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { css } from '@emotion/react';
import { EuiHealth, EuiBadge, EuiSpacer, EuiFlexGroup, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { getAbbreviatedNumber } from '../../../common/utils/get_abbreviated_number';
import { RULE_FAILED, RULE_PASSED } from '../../../../common/constants';
import { statusColors } from '../../../common/constants';
import type { Evaluation } from '../../../../common/types_old';

interface Props {
  passed: number;
  failed: number;
  distributionOnClick: (evaluation: Evaluation) => void;
}

const I18N_PASSED_FINDINGS = i18n.translate('xpack.csp.findings.distributionBar.totalPassedLabel', {
  defaultMessage: 'Passed Findings',
});

const I18N_FAILED_FINDINGS = i18n.translate('xpack.csp.findings.distributionBar.totalFailedLabel', {
  defaultMessage: 'Failed Findings',
});

export const FindingsDistributionBar = (props: Props) => (
  <div>
    <Counters {...props} />
    <EuiSpacer size="s" />
    <DistributionBar {...props} />
  </div>
);
const Counters = ({ passed, failed }: Pick<Props, 'passed' | 'failed'>) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiFlexGroup
      justifyContent="flexEnd"
      css={css`
        gap: ${euiTheme.size.m};
      `}
    >
      <EuiHealth color={statusColors.passed}>{I18N_PASSED_FINDINGS}</EuiHealth>
      <EuiBadge>{getAbbreviatedNumber(passed)}</EuiBadge>
      <EuiHealth color={statusColors.failed}>{I18N_FAILED_FINDINGS}</EuiHealth>
      <EuiBadge>{getAbbreviatedNumber(failed)}</EuiBadge>
    </EuiFlexGroup>
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
        aria-label={`${I18N_PASSED_FINDINGS}: ${passed}`}
      />
      <DistributionBarPart
        value={failed}
        color={statusColors.failed}
        distributionOnClick={() => {
          distributionOnClick(RULE_FAILED);
        }}
        data-test-subj="distribution_bar_failed"
        aria-label={`${I18N_FAILED_FINDINGS}: ${failed}`}
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
  ['aria-label']: string;
}) => (
  <button
    data-test-subj={rest['data-test-subj']}
    aria-label={rest['aria-label']}
    onClick={distributionOnClick}
    css={{
      background: color,
      height: '100%',
    }}
    style={{
      flex: value,
    }}
  />
);
