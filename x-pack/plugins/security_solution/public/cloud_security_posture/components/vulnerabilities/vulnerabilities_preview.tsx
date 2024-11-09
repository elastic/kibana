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
import { useVulnerabilitiesPreview } from '@kbn/cloud-security-posture/src/hooks/use_vulnerabilities_preview';
import {
  buildEntityFlyoutPreviewQuery,
  getAbbreviatedNumber,
} from '@kbn/cloud-security-posture-common';
import { getVulnerabilityStats, hasVulnerabilitiesData } from '@kbn/cloud-security-posture';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { useMisconfigurationPreview } from '@kbn/cloud-security-posture/src/hooks/use_misconfiguration_preview';
import {
  ENTITY_FLYOUT_WITH_VULNERABILITY_PREVIEW,
  uiMetricService,
} from '@kbn/cloud-security-posture-common/utils/ui_metrics';
import { METRIC_TYPE } from '@kbn/analytics';
import { ExpandablePanel } from '../../../flyout/shared/components/expandable_panel';
import { EntityDetailsLeftPanelTab } from '../../../flyout/entity_details/shared/components/left_panel/left_panel_header';
import { HostDetailsPanelKey } from '../../../flyout/entity_details/host_details_left';
import { useRiskScore } from '../../../entity_analytics/api/hooks/use_risk_score';
import { RiskScoreEntity } from '../../../../common/entity_analytics/risk_engine';
import { buildHostNamesFilter } from '../../../../common/search_strategy';

const FIRST_RECORD_PAGINATION = {
  cursorStart: 0,
  querySize: 1,
};

const VulnerabilitiesCount = ({
  vulnerabilitiesTotal,
  euiTheme,
}: {
  vulnerabilitiesTotal: string | number;
  euiTheme: EuiThemeComputed<{}>;
}) => {
  return (
    <EuiFlexItem>
      <EuiFlexGroup direction="column" gutterSize="none">
        <EuiFlexItem>
          <EuiTitle size="s">
            <h3>{vulnerabilitiesTotal}</h3>
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
              id="xpack.securitySolution.flyout.right.insights.vulnerabilities.vulnerabilitiesCountDescription"
              defaultMessage="Vulnerabilities"
            />
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexItem>
  );
};

export const VulnerabilitiesPreview = ({
  name,
  isPreviewMode,
  hasNonClosedAlerts = false,
}: {
  name: string;
  isPreviewMode?: boolean;
  hasNonClosedAlerts?: boolean;
}) => {
  useEffect(() => {
    uiMetricService.trackUiMetric(METRIC_TYPE.CLICK, ENTITY_FLYOUT_WITH_VULNERABILITY_PREVIEW);
  }, []);

  const { data } = useVulnerabilitiesPreview({
    query: buildEntityFlyoutPreviewQuery('host.name', name),
    sort: [],
    enabled: true,
    pageSize: 1,
  });

  const { CRITICAL = 0, HIGH = 0, MEDIUM = 0, LOW = 0, NONE = 0 } = data?.count || {};

  const totalVulnerabilities = CRITICAL + HIGH + MEDIUM + LOW + NONE;

  const hasVulnerabilitiesFindings = hasVulnerabilitiesData({
    critical: CRITICAL,
    high: HIGH,
    medium: MEDIUM,
    low: LOW,
    none: NONE,
  });

  const { euiTheme } = useEuiTheme();

  const { data: dataMisconfiguration } = useMisconfigurationPreview({
    query: buildEntityFlyoutPreviewQuery('host.name', name),
    sort: [],
    enabled: true,
    pageSize: 1,
  });

  const passedFindings = dataMisconfiguration?.count.passed || 0;
  const failedFindings = dataMisconfiguration?.count.failed || 0;

  const hasMisconfigurationFindings = passedFindings > 0 || failedFindings > 0;

  const buildFilterQuery = useMemo(() => buildHostNamesFilter([name]), [name]);
  const riskScoreState = useRiskScore({
    riskEntity: RiskScoreEntity.host,
    filterQuery: buildFilterQuery,
    onlyLatest: false,
    pagination: FIRST_RECORD_PAGINATION,
  });
  const { data: hostRisk } = riskScoreState;
  const riskData = hostRisk?.[0];
  const isRiskScoreExist = riskData?.host.risk;
  const { openLeftPanel } = useExpandableFlyoutApi();
  const goToEntityInsightTab = useCallback(() => {
    openLeftPanel({
      id: HostDetailsPanelKey,
      params: {
        name,
        isRiskScoreExist,
        hasMisconfigurationFindings,
        hasVulnerabilitiesFindings,
        hasNonClosedAlerts,
        path: { tab: EntityDetailsLeftPanelTab.CSP_INSIGHTS, subTab: 'vulnerabilitiesTabId' },
      },
    });
  }, [
    hasMisconfigurationFindings,
    hasNonClosedAlerts,
    hasVulnerabilitiesFindings,
    isRiskScoreExist,
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
        iconType: !isPreviewMode && hasVulnerabilitiesFindings ? 'arrowStart' : '',
        title: (
          <EuiTitle
            css={css`
              font-weight: ${euiTheme.font.weight.semiBold};
            `}
          >
            <FormattedMessage
              id="xpack.securitySolution.flyout.right.insights.vulnerabilities.vulnerabilitiesTitle"
              defaultMessage="Vulnerabilities"
            />
          </EuiTitle>
        ),
        link,
      }}
      data-test-subj={'securitySolutionFlyoutInsightsVulnerabilities'}
    >
      <EuiFlexGroup gutterSize="none">
        <VulnerabilitiesCount
          vulnerabilitiesTotal={getAbbreviatedNumber(totalVulnerabilities)}
          euiTheme={euiTheme}
        />
        <EuiFlexItem grow={2}>
          <EuiFlexGroup direction="column" gutterSize="none">
            <EuiFlexItem />
            <EuiFlexItem>
              <EuiSpacer />
              <DistributionBar
                stats={getVulnerabilityStats({
                  critical: CRITICAL,
                  high: HIGH,
                  medium: MEDIUM,
                  low: LOW,
                  none: NONE,
                })}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </ExpandablePanel>
  );
};
