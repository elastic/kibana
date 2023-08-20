/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexItem, EuiFlexGroup, useEuiFontSize, useEuiTheme } from '@elastic/eui';

import React from 'react';
import { css } from '@emotion/react';

import * as i18n from './translations';

import type { RiskScoreEntity } from '../../../../../common/search_strategy';
import { RiskSeverity } from '../../../../../common/search_strategy';
import { getEmptyTagValue } from '../../../../common/components/empty_value';
import { RiskScore } from '../../../../explore/components/risk_score/severity/common';
import type { RiskScoreState } from '../../../../explore/containers/risk_score';

export const RiskScoreField = ({
  riskScoreState,
}: {
  riskScoreState: RiskScoreState<RiskScoreEntity.user>;
}) => {
  const { euiTheme } = useEuiTheme();
  const { fontSize: xsFontSize } = useEuiFontSize('xs');
  const { data: userRisk, isAuthorized: isRiskScoreAuthorized } = riskScoreState;
  const userRiskData = userRisk && userRisk.length > 0 ? userRisk[0] : undefined;

  if (!isRiskScoreAuthorized) {
    return null;
  }

  return (
    <EuiFlexGroup
      alignItems="center"
      gutterSize="none"
      responsive={false}
      data-test-subj="user-details-risk-score"
    >
      <EuiFlexItem grow={false}>
        <span
          css={css`
            font-weight: ${euiTheme.font.weight.bold};
            font-size: ${xsFontSize};
            margin-right: ${euiTheme.size.xs};
          `}
        >
          {i18n.RISK_SCORE}
          {': '}
        </span>
      </EuiFlexItem>
      {userRiskData ? (
        <>
          <EuiFlexItem grow={false}>
            {Math.round(userRiskData.user.risk.calculated_score_norm)}
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <RiskScore severity={RiskSeverity.high} hideBackgroundColor />
          </EuiFlexItem>
        </>
      ) : (
        getEmptyTagValue()
      )}
    </EuiFlexGroup>
  );
};
