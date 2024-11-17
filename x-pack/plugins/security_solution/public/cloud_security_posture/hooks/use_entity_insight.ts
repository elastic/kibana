/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { useCallback } from 'react';
import { EntityDetailsLeftPanelTab } from '../../flyout/entity_details/shared/components/left_panel/left_panel_header';
import { HostDetailsPanelKey } from '../../flyout/entity_details/host_details_left';
import { UserDetailsPanelKey } from '../../flyout/entity_details/user_details_left';

export const useEntityInsight = ({
  isUsingHostName,
  name,
  isRiskScoreExist,
  hasMisconfigurationFindings,
  hasNonClosedAlerts,
  hasVulnerabilitiesFindings,
  subTab,
}: {
  isUsingHostName: boolean;
  name: string;
  isRiskScoreExist: boolean;
  hasMisconfigurationFindings: boolean;
  hasNonClosedAlerts: boolean;
  hasVulnerabilitiesFindings: boolean;
  subTab: string;
}) => {
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
              subTab,
            },
          }
        : {
            user: { name },
            isRiskScoreExist,
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
    isUsingHostName,
    name,
    isRiskScoreExist,
    hasMisconfigurationFindings,
    hasVulnerabilitiesFindings,
    hasNonClosedAlerts,
    subTab,
  ]);

  return { goToEntityInsightTab };
};
