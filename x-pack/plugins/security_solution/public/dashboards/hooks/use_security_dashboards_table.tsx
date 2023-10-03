/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useCallback } from 'react';
import type { MouseEventHandler } from 'react';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { LinkAnchor } from '../../common/components/links';
import { useKibana, useNavigateTo } from '../../common/lib/kibana';
import { METRIC_TYPE, TELEMETRY_EVENT, track } from '../../common/lib/telemetry';
import { SecurityPageName } from '../../../common/constants';
import { useGetSecuritySolutionUrl } from '../../common/components/link_to';
import { useFetchSecurityDashboards } from '../containers/use_fetch_security_dashboards';
import { getEmptyValue } from '../../common/components/empty_value';
import type { DashboardTableItem } from '../types';

export const useSecurityDashboardsTableItems = () => {
  const { dashboards, isLoading, error } = useFetchSecurityDashboards();

  const items = useMemo(() => {
    if (!dashboards) {
      return [];
    }
    return dashboards.map((securityDashboard) => ({
      ...securityDashboard,
      title: securityDashboard.attributes.title?.toString() ?? undefined,
      description: securityDashboard.attributes.description?.toString() ?? undefined,
    }));
  }, [dashboards]);

  return { items, isLoading, error };
};

export const useSecurityDashboardsTableColumns = (): Array<
  EuiBasicTableColumn<DashboardTableItem>
> => {
  const { savedObjectsTagging } = useKibana().services;
  const { navigateTo } = useNavigateTo();
  const getSecuritySolutionUrl = useGetSecuritySolutionUrl();

  const getNavigationHandler = useCallback(
    (href: string): MouseEventHandler =>
      (ev) => {
        ev.preventDefault();
        track(METRIC_TYPE.CLICK, TELEMETRY_EVENT.DASHBOARD);
        navigateTo({ url: href });
      },
    [navigateTo]
  );

  const columns = useMemo(
    (): Array<EuiBasicTableColumn<DashboardTableItem>> => [
      {
        field: 'title',
        name: i18n.translate('xpack.securitySolution.dashboards.title', {
          defaultMessage: 'Title',
        }),
        sortable: true,
        render: (title: string, { id }) => {
          const href = `${getSecuritySolutionUrl({
            deepLinkId: SecurityPageName.dashboards,
            path: id,
          })}`;
          return href ? (
            <LinkAnchor href={href} onClick={getNavigationHandler(href)}>
              {title}
            </LinkAnchor>
          ) : (
            title
          );
        },
        'data-test-subj': 'dashboardTableTitleCell',
      },
      {
        field: 'description',
        name: i18n.translate('xpack.securitySolution.dashboards.description', {
          defaultMessage: 'Description',
        }),
        sortable: true,
        render: (description: string) => description || getEmptyValue(),
        'data-test-subj': 'dashboardTableDescriptionCell',
      },
      // adds the tags table column based on the saved object items
      ...(savedObjectsTagging ? [savedObjectsTagging.ui.getTableColumnDefinition()] : []),
    ],
    [savedObjectsTagging, getSecuritySolutionUrl, getNavigationHandler]
  );

  return columns;
};
