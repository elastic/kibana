/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MouseEventHandler } from 'react';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { EuiLink } from '@elastic/eui';
import type { SavedObjectAttributes } from '@kbn/securitysolution-io-ts-alerting-types';
import type { SavedObjectsClientContract, SavedObject } from '@kbn/core/public';
import { useKibana } from '../../lib/kibana';
import * as i18n from './translations';

export interface DashboardTableItem extends SavedObject<SavedObjectAttributes> {
  title?: string;
  description?: string;
}

const SECURITY_TAG_NAME = 'security' as const;
const EMPTY_DESCRIPTION = '-' as const;

const getSecurityDashboardItems = async (
  savedObjectsClient: SavedObjectsClientContract
): Promise<DashboardTableItem[]> => {
  if (savedObjectsClient) {
    const tagResponse = await savedObjectsClient.find<SavedObjectAttributes>({
      type: 'tag',
      searchFields: ['name'],
      search: SECURITY_TAG_NAME,
    });

    const tagId = tagResponse.savedObjects[0]?.id;

    if (tagId) {
      const dashboardsResponse = await savedObjectsClient.find<SavedObjectAttributes>({
        type: 'dashboard',
        hasReference: { id: tagId, type: 'tag' },
      });

      return dashboardsResponse.savedObjects.map((item) => ({
        ...item,
        title: item.attributes.title?.toString() ?? undefined,
        description: item.attributes.description?.toString() ?? undefined,
      }));
    }
  }
  return [];
};

export const useSecurityDashboardsTableItems = () => {
  const [dashboardItems, setDashboardItems] = useState<DashboardTableItem[]>([]);

  const {
    savedObjects: { client: savedObjectsClient },
  } = useKibana().services;

  useEffect(() => {
    let ignore = false;
    const fetchDashboards = async () => {
      const items = await getSecurityDashboardItems(savedObjectsClient);
      if (!ignore) {
        setDashboardItems(items);
      }
    };

    fetchDashboards();
    return () => {
      ignore = true;
    };
  }, [savedObjectsClient]);

  return dashboardItems;
};

export const useDashboardsTableColumns = (): Array<EuiBasicTableColumn<DashboardTableItem>> => {
  const {
    application: { navigateToUrl },
    savedObjectsTagging,
    dashboard: { locator } = {},
  } = useKibana().services;

  const getNavigationHandler = useCallback(
    (href: string): MouseEventHandler =>
      (ev) => {
        ev.preventDefault();
        navigateToUrl(href);
      },
    [navigateToUrl]
  );

  const columns = useMemo(
    (): Array<EuiBasicTableColumn<DashboardTableItem>> => [
      {
        field: 'title',
        name: i18n.DASHBOARD_TITLE,
        'data-test-subj': 'dashboard-title-field',
        render: (title: string, { id }) => {
          const href = locator?.getRedirectUrl({ dashboardId: id });
          return href ? (
            // eslint-disable-next-line @elastic/eui/href-or-on-click
            <EuiLink href={href} onClick={getNavigationHandler(href)}>
              {title}
            </EuiLink>
          ) : (
            title
          );
        },
      },
      {
        field: 'description',
        name: i18n.DASHBOARDS_DESCRIPTION,
        'data-test-subj': 'dashboard-description-field',
        render: (description: string) => description || EMPTY_DESCRIPTION,
      },
      // adds the tags table column based on the saved object items
      ...(savedObjectsTagging ? [savedObjectsTagging.ui.getTableColumnDefinition()] : []),
    ],
    [getNavigationHandler, locator, savedObjectsTagging]
  );

  return columns;
};
