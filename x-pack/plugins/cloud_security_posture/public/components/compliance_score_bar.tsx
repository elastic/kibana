/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiText, EuiToolTip, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { calculatePostureScore } from '../../common/utils/helpers';
import { statusColors } from '../common/constants';

/**
 * This component will take 100% of the width set by the parent
 * */
export const ComplianceScoreBar = ({
  totalPassed,
  totalFailed,
  size = 'm',
}: {
  totalPassed: number;
  totalFailed: number;
  size?: 'm' | 'l';
}) => {
  const { euiTheme } = useEuiTheme();
  const complianceScore = calculatePostureScore(totalPassed, totalFailed);

  return (
    <EuiToolTip
      anchorProps={{
        // ensures the compliance bar takes full width of its parent
        css: css`
          width: 100%;
        `,
      }}
      content={i18n.translate('xpack.csp.complianceScoreBar.tooltipTitle', {
        defaultMessage: '{failed} failed and {passed} passed findings',
        values: {
          passed: totalPassed,
          failed: totalFailed,
        },
      })}
    >
      <EuiFlexGroup gutterSize="xs" alignItems="center" justifyContent="flexEnd">
        <EuiFlexItem>
          <EuiFlexGroup
            gutterSize="none"
            css={css`
              height: ${size === 'm' ? euiTheme.size.xs : '6px'};
              border-radius: ${euiTheme.border.radius.medium};
              overflow: hidden;
              gap: 1px;
            `}
          >
            {!!totalPassed && (
              <EuiFlexItem
                css={css`
                  flex: ${totalPassed};
                  background: ${statusColors.passed};
                `}
              />
            )}
            {!!totalFailed && (
              <EuiFlexItem
                css={css`
                  flex: ${totalFailed};
                  background: ${statusColors.failed};
                `}
              />
            )}
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem
          grow={false}
          css={css`
            width: ${euiTheme.size.xxl};
            text-align: right;
          `}
        >
          <EuiText
            size="xs"
            css={css`
              font-weight: ${euiTheme.font.weight.bold};
            `}
          >{`${complianceScore.toFixed(0)}%`}</EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiToolTip>
  );
};
