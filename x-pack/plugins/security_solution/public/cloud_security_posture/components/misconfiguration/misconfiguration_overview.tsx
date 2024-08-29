/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { css } from '@emotion/react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText, useEuiTheme, EuiTitle } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { DistributionBar } from '@kbn/security-solution-distribution-bar';
import { useMisconfigurationPreview } from '@kbn/cloud-security-posture/src/hooks/use_misconfiguration_preview';
import { euiThemeVars } from '@kbn/ui-theme';
import { i18n } from '@kbn/i18n';
import { ExpandablePanel } from '@kbn/security-solution-common';
import { buildMisconfigurationPreviewQuery } from '@kbn/cloud-security-posture-common';

export const MisconfigurationsOverview = ({ hostName }: { hostName: string }) => {
  const hostNameQuery = useMemo(() => {
    return buildMisconfigurationPreviewQuery('host.name', hostName);
  }, [hostName]);

  const { data } = useMisconfigurationPreview({
    query: hostNameQuery,
    sort: [],
    enabled: true,
    pageSize: 1,
  });

  const passedFindings = data?.count.passed || 0;
  const failedFindings = data?.count.failed || 0;
  const { euiTheme } = useEuiTheme();
  const getFindingsStats = (passedFindingsStats: number, failedFindingsStats: number) => {
    if (passedFindingsStats === 0 && failedFindingsStats === 0) return [];
    return [
      {
        key: i18n.translate(
          'xpack.securitySolution.flyout.right.insights.misconfigurations.passedFindingsText',
          {
            defaultMessage: 'Passed findings',
          }
        ),
        count: passedFindingsStats,
        color: euiThemeVars.euiColorSuccess,
      },
      {
        key: i18n.translate(
          'xpack.securitySolution.flyout.right.insights.misconfigurations.failedFindingsText',
          {
            defaultMessage: 'Failed findings',
          }
        ),
        count: failedFindingsStats,
        color: euiThemeVars.euiColorVis9,
      },
    ];
  };

  const MisconfigurationEmptyState = () => {
    return (
      <EuiFlexItem>
        <EuiFlexGroup direction="column" gutterSize="none">
          <EuiFlexItem>
            <EuiTitle
              size="m"
              css={css`
                font-weight: ${euiTheme.font.weight.bold};
              `}
            >
              <h1>{'-'}</h1>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText
              size="m"
              css={css`
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
    );
  };

  const MisconfigurationPreviewScore = () => {
    return (
      <EuiFlexItem>
        <EuiFlexGroup direction="column" gutterSize="none">
          <EuiFlexItem>
            <EuiTitle
              size="s"
              css={css`
                font-weight: ${euiTheme.font.weight.bold};
              `}
            >
              <h1>{`${Math.round(
                (passedFindings / (passedFindings + failedFindings)) * 100
              )}%`}</h1>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText
              size="m"
              css={css`
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
    );
  };

  return (
    <ExpandablePanel
      header={{
        title: (
          <EuiText
            size="xs"
            css={css`
              font-weight: ${euiTheme.font.weight.semiBold};
            `}
          >
            <FormattedMessage
              id="xpack.securitySolution.flyout.right.insights.misconfigurations.misconfigurationsTitle"
              defaultMessage="Misconfigurations"
            />
          </EuiText>
        ),
        // TODO: Uncomment when we have the expanded flyout
        // iconType: 'arrowStart',
      }}
      data-test-subj={'securitySolutionFlyoutInsightsMisconfigurations'}
    >
      <EuiFlexGroup gutterSize="none">
        {passedFindings === 0 && failedFindings === 0 ? (
          <MisconfigurationEmptyState />
        ) : (
          <MisconfigurationPreviewScore />
        )}
        <EuiFlexItem grow={2}>
          <EuiFlexGroup direction="column" gutterSize="none">
            <EuiFlexItem />
            <EuiFlexItem>
              <EuiSpacer />
              <DistributionBar stats={getFindingsStats(passedFindings, failedFindings)} />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </ExpandablePanel>
  );
};
