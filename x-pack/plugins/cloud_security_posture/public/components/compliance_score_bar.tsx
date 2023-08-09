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
}: {
  totalPassed: number;
  totalFailed: number;
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
      <EuiFlexGroup
        gutterSize="none"
        alignItems="center"
        justifyContent="flexEnd"
        style={{ gap: euiTheme.size.s }}
      >
        <EuiFlexItem>
          <EuiFlexGroup
            gutterSize="none"
            style={{
              height: euiTheme.size.xs,
              borderRadius: euiTheme.border.radius.medium,
              overflow: 'hidden',
              gap: 1,
            }}
          >
            {!!totalPassed && (
              <EuiFlexItem
                style={{
                  flex: totalPassed,
                  background: statusColors.passed,
                }}
              />
            )}
            {!!totalFailed && (
              <EuiFlexItem
                style={{
                  flex: totalFailed,
                  background: statusColors.failed,
                }}
              />
            )}
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText
            size="xs"
            style={{ fontWeight: euiTheme.font.weight.bold }}
          >{`${complianceScore.toFixed(0)}%`}</EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiToolTip>
  );
};
