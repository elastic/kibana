/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiText, EuiToolTip, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { calculatePostureScore } from '../../common/utils/helpers';
import { statusColors } from '../common/constants';

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
    <EuiFlexGroup
      gutterSize="none"
      alignItems="center"
      justifyContent="flexEnd"
      style={{ gap: euiTheme.size.s }}
    >
      <EuiFlexItem>
        <EuiToolTip
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
            style={{
              height: euiTheme.size.xs,
              borderRadius: euiTheme.border.radius.medium,
              overflow: 'hidden',
              gap: 1,
            }}
          >
            {!!totalFailed && (
              <EuiFlexItem
                style={{
                  flex: totalFailed,
                  background: statusColors.failed,
                }}
              />
            )}
            {!!totalPassed && (
              <EuiFlexItem
                style={{
                  flex: totalPassed,
                  background: statusColors.passed,
                }}
              />
            )}
          </EuiFlexGroup>
        </EuiToolTip>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText
          size="xs"
          style={{ fontWeight: euiTheme.font.weight.bold }}
        >{`${complianceScore.toFixed(0)}%`}</EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
