/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import type { EuiThemeComputed } from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText, useEuiTheme, EuiTitle } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { DistributionBar } from '@kbn/security-solution-distribution-bar';
import { useMisconfigurationPreview } from '@kbn/cloud-security-posture/src/hooks/use_misconfiguration_preview';
import { euiThemeVars } from '@kbn/ui-theme';
import { i18n } from '@kbn/i18n';
import { ExpandablePanel } from '@kbn/security-solution-common';
import { buildEntityFlyoutPreviewQuery } from '@kbn/cloud-security-posture-common';

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

const MisconfigurationEmptyState = ({ euiTheme }: { euiTheme: EuiThemeComputed<{}> }) => {
  return (
    <EuiFlexItem>
      <EuiFlexGroup direction="column" gutterSize="none">
        <EuiFlexItem>
          <EuiTitle size="m">
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

const MisconfigurationPreviewScore = ({
  passedFindings,
  failedFindings,
  euiTheme,
}: {
  passedFindings: number;
  failedFindings: number;
  euiTheme: EuiThemeComputed<{}>;
}) => {
  return (
    <EuiFlexItem>
      <EuiFlexGroup direction="column" gutterSize="none">
        <EuiFlexItem>
          <EuiTitle size="s">
            <h1>{`${Math.round((passedFindings / (passedFindings + failedFindings)) * 100)}%`}</h1>
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

export const MisconfigurationsPreview = ({ hostName }: { hostName: string }) => {
  const { data } = useMisconfigurationPreview({
    query: buildEntityFlyoutPreviewQuery('host.name', hostName),
    sort: [],
    enabled: true,
    pageSize: 1,
  });

  const passedFindings = data?.count.passed || 0;
  const failedFindings = data?.count.failed || 0;

  const { euiTheme } = useEuiTheme();
  const hasMisconfigurationFindings = passedFindings > 0 || failedFindings > 0;
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
      }}
      data-test-subj={'securitySolutionFlyoutInsightsMisconfigurations'}
    >
      <EuiFlexGroup gutterSize="none">
        {hasMisconfigurationFindings ? (
          <MisconfigurationPreviewScore
            passedFindings={passedFindings}
            failedFindings={failedFindings}
            euiTheme={euiTheme}
          />
        ) : (
          <MisconfigurationEmptyState euiTheme={euiTheme} />
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
