/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo } from 'react';
import { css } from '@emotion/react';
import type { EuiThemeComputed } from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText, useEuiTheme, EuiTitle } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { DistributionBar } from '@kbn/security-solution-distribution-bar';
import { useMisconfigurationPreview } from '@kbn/cloud-security-posture/src/hooks/use_misconfiguration_preview';
import { i18n } from '@kbn/i18n';
import { buildEntityFlyoutPreviewQuery } from '@kbn/cloud-security-posture-common';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { useVulnerabilitiesPreview } from '@kbn/cloud-security-posture/src/hooks/use_vulnerabilities_preview';
import { hasVulnerabilitiesData, statusColors } from '@kbn/cloud-security-posture';
import { METRIC_TYPE } from '@kbn/analytics';
import {
  ENTITY_FLYOUT_WITH_MISCONFIGURATION_VISIT,
  uiMetricService,
} from '@kbn/cloud-security-posture-common/utils/ui_metrics';
import { ExpandablePanel } from '../../../flyout/shared/components/expandable_panel';
import {
  CspInsightLeftPanelSubTab,
  EntityDetailsLeftPanelTab,
} from '../../../flyout/entity_details/shared/components/left_panel/left_panel_header';
import { UserDetailsPanelKey } from '../../../flyout/entity_details/user_details_left';
import { HostDetailsPanelKey } from '../../../flyout/entity_details/host_details_left';
import { useRiskScore } from '../../../entity_analytics/api/hooks/use_risk_score';
import { RiskScoreEntity } from '../../../../common/entity_analytics/risk_engine';
import type { HostRiskScore, UserRiskScore } from '../../../../common/search_strategy';
import { buildHostNamesFilter, buildUserNamesFilter } from '../../../../common/search_strategy';

const FIRST_RECORD_PAGINATION = {
  cursorStart: 0,
  querySize: 1,
};

export const getFindingsStats = (passedFindingsStats: number, failedFindingsStats: number) => {
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
      color: statusColors.passed,
    },
    {
      key: i18n.translate(
        'xpack.securitySolution.flyout.right.insights.misconfigurations.failedFindingsText',
        {
          defaultMessage: 'Failed findings',
        }
      ),
      count: failedFindingsStats,
      color: statusColors.failed,
    },
  ];
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
            <h3>{`${Math.round((passedFindings / (passedFindings + failedFindings)) * 100)}%`}</h3>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText
            size="xs"
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

export const MisconfigurationsPreview = ({
  name,
  fieldName,
  isPreviewMode,
}: {
  name: string;
  fieldName: 'host.name' | 'user.name';
  isPreviewMode?: boolean;
}) => {
  const { data } = useMisconfigurationPreview({
    query: buildEntityFlyoutPreviewQuery(fieldName, name),
    sort: [],
    enabled: true,
    pageSize: 1,
    ignore_unavailable: true,
  });
  const isUsingHostName = fieldName === 'host.name';
  const passedFindings = data?.count.passed || 0;
  const failedFindings = data?.count.failed || 0;

  useEffect(() => {
    uiMetricService.trackUiMetric(METRIC_TYPE.CLICK, ENTITY_FLYOUT_WITH_MISCONFIGURATION_VISIT);
  }, []);
  const { euiTheme } = useEuiTheme();
  const hasMisconfigurationFindings = passedFindings > 0 || failedFindings > 0;

  const { data: vulnerabilitiesData } = useVulnerabilitiesPreview({
    query: buildEntityFlyoutPreviewQuery('host.name', name),
    sort: [],
    enabled: true,
    pageSize: 1,
  });

  const {
    CRITICAL = 0,
    HIGH = 0,
    MEDIUM = 0,
    LOW = 0,
    NONE = 0,
  } = vulnerabilitiesData?.count || {};

  const hasVulnerabilitiesFindings = hasVulnerabilitiesData({
    critical: CRITICAL,
    high: HIGH,
    medium: MEDIUM,
    low: LOW,
    none: NONE,
  });

  const buildFilterQuery = useMemo(
    () => (isUsingHostName ? buildHostNamesFilter([name]) : buildUserNamesFilter([name])),
    [isUsingHostName, name]
  );

  const riskScoreState = useRiskScore({
    riskEntity: isUsingHostName ? RiskScoreEntity.host : RiskScoreEntity.user,
    filterQuery: buildFilterQuery,
    onlyLatest: false,
    pagination: FIRST_RECORD_PAGINATION,
  });

  const { data: hostRisk } = riskScoreState;

  const riskData = hostRisk?.[0];

  const isRiskScoreExist = isUsingHostName
    ? !!(riskData as HostRiskScore)?.host.risk
    : !!(riskData as UserRiskScore)?.user.risk;

  const { openLeftPanel } = useExpandableFlyoutApi();

  const goToEntityInsightTab = useCallback(() => {
    openLeftPanel({
      id: isUsingHostName ? HostDetailsPanelKey : UserDetailsPanelKey,
      params: isUsingHostName
        ? {
            name,
            isRiskScoreExist,
            hasMisconfigurationFindings,
            hasVulnerabilitiesFindings,
            path: {
              tab: EntityDetailsLeftPanelTab.CSP_INSIGHTS,
              subTab: CspInsightLeftPanelSubTab.MISCONFIGURATIONS,
            },
          }
        : {
            user: { name },
            isRiskScoreExist,
            hasMisconfigurationFindings,
            path: { tab: EntityDetailsLeftPanelTab.CSP_INSIGHTS },
          },
    });
  }, [
    hasMisconfigurationFindings,
    hasVulnerabilitiesFindings,
    isRiskScoreExist,
    isUsingHostName,
    name,
    openLeftPanel,
  ]);
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
        iconType: !isPreviewMode && hasMisconfigurationFindings ? 'arrowStart' : '',
        title: (
          <EuiTitle
            css={css`
              font-weight: ${euiTheme.font.weight.semiBold};
            `}
            data-test-subj={'securitySolutionFlyoutInsightsMisconfigurationsTitleText'}
          >
            <FormattedMessage
              id="xpack.securitySolution.flyout.right.insights.misconfigurations.misconfigurationsTitle"
              defaultMessage="Misconfigurations"
            />
          </EuiTitle>
        ),
        link: hasMisconfigurationFindings ? link : undefined,
      }}
      data-test-subj={'securitySolutionFlyoutInsightsMisconfigurations'}
    >
      <EuiFlexGroup gutterSize="none">
        <MisconfigurationPreviewScore
          passedFindings={passedFindings}
          failedFindings={failedFindings}
          euiTheme={euiTheme}
        />

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
