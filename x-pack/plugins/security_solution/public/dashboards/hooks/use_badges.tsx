/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { DashboardAPI } from '@kbn/dashboard-plugin/public';
import { i18n } from '@kbn/i18n';
import { ViewMode } from '@kbn/embeddable-plugin/public';
import type { TopNavMenuProps } from '@kbn/navigation-plugin/public';
import type { EuiBadgeProps, EuiToolTipProps } from '@elastic/eui';

type Badge = EuiBadgeProps & {
  badgeText: string;
  toolTipProps?: Partial<EuiToolTipProps>;
};

export const useBadges: (params: { dashboardContainer: DashboardAPI }) => Badge[] | null = ({
  dashboardContainer,
}) => {
  const hasUnsavedChanges = dashboardContainer.select(
    (state) => state.componentState.hasUnsavedChanges
  );
  const hasRunMigrations = dashboardContainer.select(
    (state) => state.componentState.hasRunClientsideMigrations
  );
  const viewMode = dashboardContainer.select((state) => state.explicitInput.viewMode);

  const badges = useMemo(() => {
    if (viewMode !== ViewMode.EDIT) return null;
    const allBadges: TopNavMenuProps['badges'] = [];
    if (hasUnsavedChanges) {
      allBadges.push({
        'data-test-subj': 'dashboardUnsavedChangesBadge',
        badgeText: i18n.translate('xpack.securitySolution.dashboard.unsavedChangesBadge', {
          defaultMessage: 'Unsaved changes',
        }),
        title: '',
        color: 'warning',
        toolTipProps: {
          content: i18n.translate(
            'xpack.securitySolution.dashboard.unsavedChangesBadgeToolTipContent',
            {
              defaultMessage:
                ' You have unsaved changes in this dashboard. To remove this label, save the dashboard.',
            }
          ),
          position: 'bottom',
        },
      });
    }
    if (hasRunMigrations) {
      allBadges.push({
        'data-test-subj': 'dashboardSaveRecommendedBadge',
        badgeText: i18n.translate('xpack.securitySolution.dashboard.hasRunMigrationsBadge', {
          defaultMessage: 'Save recommended',
        }),
        title: '',
        color: 'success',
        iconType: 'save',
        toolTipProps: {
          content: i18n.translate(
            'xpack.securitySolution.dashboard.hasRunMigrationsBadgeToolTipContent',
            {
              defaultMessage:
                'One or more panels on this dashboard have been updated to a new version. Save the dashboard so it loads faster next time.',
            }
          ),
          position: 'bottom',
        },
      });
    }
    return allBadges;
  }, [hasRunMigrations, hasUnsavedChanges, viewMode]);

  return badges;
};
