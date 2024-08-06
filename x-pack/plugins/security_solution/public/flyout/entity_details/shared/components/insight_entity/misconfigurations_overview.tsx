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
import { DistributionBar } from '@kbn/security-solution-distribution-bar';
import { useLatestFindings } from '@kbn/cloud-security-posture-plugin/public';
import { euiThemeVars } from '@kbn/ui-theme';
import { ExpandablePanel } from '../../../../shared/components/expandable_panel';

export const MisconfigurationsOverview = ({ hostName }: { hostName: string }) => {
  const queryHostName = {
    bool: {
      must: [],
      filter: [
        {
          bool: {
            should: [{ term: { 'host.name': { value: `${hostName}` } } }],
            minimum_should_match: 1,
          },
        },
      ],
      should: [],
      must_not: [],
    },
  };
  const { data } = useLatestFindings({
    query: queryHostName,
    sort: [],
    enabled: true,
    pageSize: 1,
  });

  const passedFindings = data?.pages[0].count.passed || 0;
  const failedFindings = data?.pages[0].count.failed || 0;
  const { euiTheme } = useEuiTheme();
  const getFindingsStats = (passedFindingsStats: number, failedFindingsStats: number) => {
    if (passedFindingsStats === 0 && failedFindingsStats === 0) return [];
    return [
      {
        key: 'Passed findings',
        count: passedFindingsStats,
        color: euiThemeVars.euiColorSuccess,
      },
      {
        key: 'Failed findings',
        count: failedFindingsStats,
        color: euiThemeVars.euiColorVis9,
      },
    ];
  };

  return (
    <ExpandablePanel
      header={{
        title: (
          <EuiText
            css={css`
              font-size: ${euiTheme.size.m};
              font-weight: ${euiTheme.font.weight.semiBold};
            `}
          >
            <FormattedMessage
              id="xpack.securitySolution.flyout.right.insights.misconfigurations.misconfigurationsTitle"
              defaultMessage="Misconfigurations"
            />
          </EuiText>
        ),
        // Commented this out until we have the expanded flyout
        // iconType: 'arrowStart',
      }}
      data-test-subj={'securitySolutionFlyoutInsightsMisconfigurations'}
    >
      <EuiFlexGroup gutterSize="none">
        {passedFindings === 0 && failedFindings === 0 ? (
          <EuiFlexItem>
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
                    font-size: ${euiTheme.size.base};
                    font-weight: ${euiTheme.font.weight.semiBold};
                  `}
                  data-test-subj="noFindingsDataTestSubj"
                >
                  <FormattedMessage
                    id="xpack.securitySolution.flyout.right.insights.misconfigurations.noFindingsDescription"
                    defaultMessage="No Findings"
                  />
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        ) : (
          <EuiFlexItem>
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
                    font-size: ${euiTheme.size.base};
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
          </EuiFlexItem>
        )}
        <EuiFlexItem grow={2}>
          <EuiFlexGroup direction="column" gutterSize="none">
            <EuiFlexItem />
            <EuiFlexItem
              css={css`
                margin-top: ${euiTheme.size.l};
              `}
            >
              <DistributionBar stats={getFindingsStats(passedFindings, failedFindings)} />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </ExpandablePanel>
  );
};
