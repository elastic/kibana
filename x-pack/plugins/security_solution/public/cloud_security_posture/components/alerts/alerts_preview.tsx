/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { capitalize } from 'lodash';
import type { EuiThemeComputed } from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText, EuiTitle, useEuiTheme } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { DistributionBar } from '@kbn/security-solution-distribution-bar';
import { getAbbreviatedNumber } from '@kbn/cloud-security-posture-common';
import { useHasVulnerabilities } from '@kbn/cloud-security-posture/src/hooks/use_has_vulnerabilities';
import { useHasMisconfigurations } from '@kbn/cloud-security-posture/src/hooks/use_has_misconfigurations';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import type {
  AlertsByStatus,
  ParsedAlertsData,
} from '../../../overview/components/detection_response/alerts_by_status/types';
import { ExpandablePanel } from '../../../flyout/shared/components/expandable_panel';
import { getSeverityColor } from '../../../detections/components/alerts_kpis/severity_level_panel/helpers';
import type { HostRiskScore, UserRiskScore } from '../../../../common/search_strategy';
import {
  buildHostNamesFilter,
  buildUserNamesFilter,
  RiskScoreEntity,
} from '../../../../common/search_strategy';
import { useRiskScore } from '../../../entity_analytics/api/hooks/use_risk_score';
import { FIRST_RECORD_PAGINATION } from '../../../entity_analytics/common';
import { HostDetailsPanelKey } from '../../../flyout/entity_details/host_details_left';
import {
  EntityDetailsLeftPanelTab,
  CspInsightLeftPanelSubTab,
} from '../../../flyout/entity_details/shared/components/left_panel/left_panel_header';
import { UserDetailsPanelKey } from '../../../flyout/entity_details/user_details_left';

const AlertsCount = ({
  alertsTotal,
  euiTheme,
}: {
  alertsTotal: number;
  euiTheme: EuiThemeComputed<{}>;
}) => {
  return (
    <EuiFlexItem>
      <EuiFlexGroup direction="column" gutterSize="none">
        <EuiFlexItem>
          <EuiTitle size="s">
            <h1 data-test-subj={'securitySolutionFlyoutInsightsAlertsCount'}>
              {getAbbreviatedNumber(alertsTotal)}
            </h1>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText
            size="m"
            css={{
              fontWeight: euiTheme.font.weight.semiBold,
            }}
          >
            <FormattedMessage
              id="xpack.securitySolution.flyout.right.insights.alerts.alertsCountDescription"
              defaultMessage="Alerts"
            />
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexItem>
  );
};

export const AlertsPreview = ({
  alertsData,
  fieldName,
  name,
  isPreviewMode,
}: {
  alertsData: ParsedAlertsData;
  fieldName: string;
  name: string;
  isPreviewMode?: boolean;
}) => {
  const { euiTheme } = useEuiTheme();

  const severityMap = new Map<string, number>();

  (Object.keys(alertsData || {}) as AlertsByStatus[]).forEach((status) => {
    if (alertsData?.[status]?.severities) {
      alertsData?.[status]?.severities.forEach((severity) => {
        const currentSeverity = severityMap.get(severity.key) || 0;
        severityMap.set(severity.key, currentSeverity + severity.value);
      });
    }
  });

  const alertStats = Array.from(severityMap, ([key, count]) => ({
    key: capitalize(key),
    count,
    color: getSeverityColor(key),
  }));

  const totalAlertsCount = alertStats.reduce((total, item) => total + item.count, 0);

  const { hasMisconfigurationFindings } = useHasMisconfigurations(fieldName, name);

  const isUsingHostName = fieldName === 'host.name';

  const { hasVulnerabilitiesFindings } = useHasVulnerabilities('host.name', name);

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

  const hasNonClosedAlerts = totalAlertsCount > 0;

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
            hasNonClosedAlerts,
            path: {
              tab: EntityDetailsLeftPanelTab.CSP_INSIGHTS,
              subTab: CspInsightLeftPanelSubTab.ALERTS,
            },
          }
        : {
            user: { name },
            isRiskScoreExist,
            hasMisconfigurationFindings,
            hasNonClosedAlerts,
            path: {
              tab: EntityDetailsLeftPanelTab.CSP_INSIGHTS,
              subTab: CspInsightLeftPanelSubTab.ALERTS,
            },
          },
    });
  }, [
    hasMisconfigurationFindings,
    hasNonClosedAlerts,
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
                id="xpack.securitySolution.flyout.right.insights.alerts.alertsTooltip"
                defaultMessage="Show all alerts"
              />
            ),
          }
        : undefined,
    [isPreviewMode, goToEntityInsightTab]
  );
  return (
    <ExpandablePanel
      header={{
        iconType: !isPreviewMode && hasNonClosedAlerts ? 'arrowStart' : '',
        title: (
          <EuiText
            size="xs"
            css={{
              fontWeight: euiTheme.font.weight.semiBold,
            }}
          >
            <FormattedMessage
              id="xpack.securitySolution.flyout.right.insights.alerts.alertsTitle"
              defaultMessage="Alerts"
            />
          </EuiText>
        ),
        link: totalAlertsCount > 0 ? link : undefined,
      }}
      data-test-subj={'securitySolutionFlyoutInsightsAlerts'}
    >
      <EuiFlexGroup gutterSize="none">
        <AlertsCount alertsTotal={totalAlertsCount} euiTheme={euiTheme} />
        <EuiFlexItem grow={2}>
          <EuiFlexGroup direction="column" gutterSize="none">
            <EuiFlexItem />
            <EuiFlexItem>
              <EuiSpacer />
              <DistributionBar
                stats={alertStats.reverse()}
                data-test-subj="AlertsPreviewDistributionBarTestId"
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </ExpandablePanel>
  );
};
