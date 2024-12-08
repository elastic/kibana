/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { useCallback } from 'react';
import { useHasVulnerabilities } from '@kbn/cloud-security-posture/src/hooks/use_has_vulnerabilities';
import { useHasMisconfigurations } from '@kbn/cloud-security-posture/src/hooks/use_has_misconfigurations';
import { TableId } from '@kbn/securitysolution-data-table';
import { UserDetailsPanelKey } from '../../flyout/entity_details/user_details_left';
import { HostDetailsPanelKey } from '../../flyout/entity_details/host_details_left';
import { EntityDetailsLeftPanelTab } from '../../flyout/entity_details/shared/components/left_panel/left_panel_header';
import { useGlobalTime } from '../../common/containers/use_global_time';
import { DETECTION_RESPONSE_ALERTS_BY_STATUS_ID } from '../../overview/components/detection_response/alerts_by_status/types';
import { useNonClosedAlerts } from './use_non_closed_alerts';
import { useHasRiskScore } from './use_risk_score_data';

export const useNavigateEntityInsight = ({
  field,
  value,
  subTab,
  queryIdExtension,
}: {
  field: 'host.name' | 'user.name';
  value: string;
  subTab: string;
  queryIdExtension: string;
}) => {
  const isHostNameField = field === 'host.name';
  const { to, from } = useGlobalTime();

  const { hasNonClosedAlerts } = useNonClosedAlerts({
    field,
    value,
    to,
    from,
    queryId: `${DETECTION_RESPONSE_ALERTS_BY_STATUS_ID}${queryIdExtension}`,
  });

  const { hasVulnerabilitiesFindings } = useHasVulnerabilities(field, value);

  const { hasRiskScore } = useHasRiskScore({
    field,
    value,
  });
  const { hasMisconfigurationFindings } = useHasMisconfigurations(field, value);
  const { openLeftPanel } = useExpandableFlyoutApi();

  const goToEntityInsightTab = useCallback(() => {
    openLeftPanel({
      id: isHostNameField ? HostDetailsPanelKey : UserDetailsPanelKey,
      params: isHostNameField
        ? {
            name: value,
            scopeId: TableId.alertsOnAlertsPage,
            isRiskScoreExist: hasRiskScore,
            hasMisconfigurationFindings,
            hasVulnerabilitiesFindings,
            hasNonClosedAlerts,
            path: {
              tab: EntityDetailsLeftPanelTab.CSP_INSIGHTS,
              subTab,
            },
          }
        : {
            user: { name: value },
            scopeId: TableId.alertsOnAlertsPage,
            isRiskScoreExist: hasRiskScore,
            hasMisconfigurationFindings,
            hasNonClosedAlerts,
            path: {
              tab: EntityDetailsLeftPanelTab.CSP_INSIGHTS,
              subTab,
            },
          },
    });
  }, [
    openLeftPanel,
    isHostNameField,
    value,
    hasRiskScore,
    hasMisconfigurationFindings,
    hasVulnerabilitiesFindings,
    hasNonClosedAlerts,
    subTab,
  ]);

  return { goToEntityInsightTab };
};
