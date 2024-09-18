/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
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
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { HostDetailsPanelKey } from '../../../flyout/entity_details/host_details_left';
import { useRiskScore } from '../../../entity_analytics/api/hooks/use_risk_score';
import { RiskScoreEntity } from '../../../../common/entity_analytics/risk_engine';
import { buildHostNamesFilter } from '../../../../common/search_strategy';

const FIRST_RECORD_PAGINATION = {
  cursorStart: 0,
  querySize: 1,
};

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
  numberOfPassedFindings,
  numberOfFailedFindings,
}: {
  passedFindings: number;
  failedFindings: number;
  euiTheme: EuiThemeComputed<{}>;
  numberOfPassedFindings?: number;
  numberOfFailedFindings?: number;
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
  const hostNameFilterQuery = useMemo(
    () => (hostName ? buildHostNamesFilter([hostName]) : undefined),
    [hostName]
  );

  const riskScoreState = useRiskScore({
    riskEntity: RiskScoreEntity.host,
    filterQuery: hostNameFilterQuery,
    onlyLatest: false,
    pagination: FIRST_RECORD_PAGINATION,
  });
  const { data: hostRisk } = riskScoreState;
  const hostRiskData = hostRisk && hostRisk.length > 0 ? hostRisk[0] : undefined;
  const isRiskScoreExist = !!hostRiskData?.host.risk;
  const { openLeftPanel } = useExpandableFlyoutApi();
  const isPreviewMode = false;
  const goToEntityInsightTab = useCallback(() => {
    openLeftPanel({
      id: HostDetailsPanelKey,
      params: {
        name: hostName,
        isRiskScoreExist,
        hasMisconfigurationFindings,
        path: { tab: 'csp_insights' },
      },
    });
  }, [hasMisconfigurationFindings, hostName, isRiskScoreExist, openLeftPanel]);
  const link = useMemo(
    () =>
      !isPreviewMode
        ? {
            callback: goToEntityInsightTab,
            tooltip: (
              <FormattedMessage
                id="xpack.securitySolution.flyout.right.insights.misconfiguration.misconfigurationTooltip"
                defaultMessage="Show all misconfiguration findings"
              />
            ),
          }
        : undefined,
    [isPreviewMode, goToEntityInsightTab]
  );
  return (
    <ExpandablePanel
      header={{
        iconType: hasMisconfigurationFindings ? 'arrowStart' : '',
        title: (
          <EuiText
            size="xs"
            data-test-subj={'securitySolutionFlyoutInsightsMisconfigurationsTitleText'}
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
        link: hasMisconfigurationFindings ? link : undefined,
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
