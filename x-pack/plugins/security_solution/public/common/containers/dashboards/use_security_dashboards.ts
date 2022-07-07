/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectAttributes } from '@kbn/securitysolution-io-ts-alerting-types';
import { SavedObjectsClientContract } from '@kbn/core/public';
import { useState, useEffect } from 'react';
import { DashboardAppLocator } from '@kbn/dashboard-plugin/public';
import { useKibana } from '../../lib/kibana';

export interface SecurityDashboardItem {
  id: string;
  title?: string;
  description?: string;
  href?: string;
  tags: string[];
}

const SECURITY_TAG_NAME = 'security';

const TAG_REQUEST_BODY = {
  type: 'tag',
  search: SECURITY_TAG_NAME,
  searchFields: ['name'],
};

const getSecurityDashboards = async (
  savedObjectsClient: SavedObjectsClientContract,
  dashboardLocator?: DashboardAppLocator
): Promise<SecurityDashboardItem[]> => {
  if (savedObjectsClient) {
    const tagResponse = await savedObjectsClient.find<SavedObjectAttributes>(TAG_REQUEST_BODY);

    if (tagResponse?.savedObjects?.length) {
      const dashboardsResponse = await savedObjectsClient.find<SavedObjectAttributes>({
        type: 'dashboard',
        hasReference: { id: tagResponse.savedObjects[0].id, type: 'tag' },
      });

      if (dashboardsResponse?.savedObjects?.length) {
        return dashboardsResponse.savedObjects.map(
          ({ id, attributes: { title, description }, references }) => ({
            id,
            title: title?.toString() ?? undefined,
            description: description?.toString() ?? undefined,
            href: dashboardLocator?.getRedirectUrl({
              dashboardId: id,
            }),
            tags: references
              .filter((reference) => reference.type === 'tag')
              .map(({ name }) => name),
          })
        );
      }
    }
  }
  return [];
};

export const useSecurityDashboards = () => {
  const [securityDashboards, setSecurityDashboards] = useState<SecurityDashboardItem[]>([]);
  const dashboardLocator = useKibana().services.dashboard?.locator;
  const savedObjectsClient = useKibana().services.savedObjects.client;

  useEffect(() => {
    getSecurityDashboards(savedObjectsClient, dashboardLocator).then((items) => {
      setSecurityDashboards(items);
    });
  }, [savedObjectsClient, dashboardLocator]);

  return securityDashboards;
};
