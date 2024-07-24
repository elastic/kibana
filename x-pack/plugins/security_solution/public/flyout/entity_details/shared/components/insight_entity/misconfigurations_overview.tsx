/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { EuiFlexGroup, EuiFlexItem, EuiText, useEuiTheme } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { ExpandablePanel } from '../../../../shared/components/expandable_panel';

export const MisconfigurationsOverview = ({
  passedFindings,
  failedFindings,
}: {
  passedFindings: number;
  failedFindings: number;
}) => {
  const { euiTheme } = useEuiTheme();
  return (
    <ExpandablePanel
      header={{
        title: (
          <FormattedMessage
            id="xpack.securitySolution.flyout.right.insights.misconfigurations.misconfigurationsTitle"
            defaultMessage="Misconfigurations"
          />
        ),
        iconType: 'arrowStart',
      }}
      //   content={{ loading, error }}
      data-test-subj={'securitySolutionFlyoutInsightsMisconfigurations'}
    >
      <EuiFlexGroup gutterSize="s">
        {/* <EuiFlexItem></EuiFlexItem> */}
        {passedFindings === 0 && failedFindings === 0 ? (
          <EuiFlexGroup direction="column" gutterSize="none">
            <EuiFlexItem>
              <EuiText
                css={css`
                  font-size: ${euiTheme.size.l};
                  font-weight: ${euiTheme.font.weight.bold};
                `}
              >
                <b>{'-'}</b>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText
                css={css`
                  font-size: ${euiTheme.size.m};
                  font-weight: ${euiTheme.font.weight.semiBold};
                `}
              >
                <FormattedMessage
                  id="xpack.securitySolution.flyout.right.insights.misconfigurations.noFindingsDescription"
                  defaultMessage="No Findings"
                />
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        ) : (
          <EuiFlexGroup direction="column" gutterSize="none">
            <EuiFlexItem>
              <EuiText
                css={css`
                  font-size: ${euiTheme.size.l};
                  font-weight: ${euiTheme.font.weight.bold};
                `}
              >
                {`${Math.round((passedFindings / (passedFindings + failedFindings)) * 100)}%`}
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText
                css={css`
                  font-size: ${euiTheme.size.m};
                  font-weight: ${euiTheme.font.weight.semiBold};
                `}
              >
                <FormattedMessage
                  id="xpack.securitySolution.flyout.right.insights.misconfigurations.postureScoreDescription"
                  defaultMessage="Posture score"
                />
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        )}
        <EuiFlexGroup direction="column" gutterSize="s">
          <EuiFlexItem />
          <EuiFlexItem>{'BAR COMPONENT HERE PLACE HOLDER'}</EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexGroup>
    </ExpandablePanel>
  );
};
