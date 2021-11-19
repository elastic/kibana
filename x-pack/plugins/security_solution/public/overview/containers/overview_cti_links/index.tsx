/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useState, useEffect, useCallback } from 'react';
import { SavedObjectAttributes } from '@kbn/securitysolution-io-ts-alerting-types';
import { useKibana } from '../../../common/lib/kibana';
import { TAG_REQUEST_BODY } from './helpers';

interface Integration {
  id: string;
  dashboardIds: string[];
}

export const useCtiDashboardLinks = ({
  to,
  from,
  integrations = [],
}: { to?: string; from?: string; integrations?: [] } = {}) => {
  const [installedDashboardIds, setInstalledDashboardIds] = useState<string[]>([]);
  const dashboardLocator = useKibana().services.dashboard?.locator;
  const savedObjectsClient = useKibana().services.savedObjects.client;

  const handleTagsReceived = useCallback(
    (TagsSO?) => {
      if (TagsSO?.savedObjects?.length) {
        return savedObjectsClient.find<SavedObjectAttributes>({
          type: 'dashboard',
          hasReference: { id: TagsSO.savedObjects[0].id, type: 'tag' },
        });
      }
      return undefined;
    },
    [savedObjectsClient]
  );

  useEffect(() => {
    if (savedObjectsClient) {
      savedObjectsClient
        .find<SavedObjectAttributes>(TAG_REQUEST_BODY)
        .then(handleTagsReceived)
        .then(
          async (DashboardsSO?: {
            savedObjects?: Array<{
              attributes?: SavedObjectAttributes;
              id?: string;
            }>;
          }) => {
            if (DashboardsSO?.savedObjects?.length) {
              setInstalledDashboardIds(
                DashboardsSO.savedObjects.map((SO) => SO.id ?? '').filter(Boolean)
              );
            }
          }
        );
    }
  }, [handleTagsReceived, savedObjectsClient]);

  const listItems = integrations.map((integration) => {
    const listItem = {
      title: integration.name,
      count: integration.count,
    };

    if (
      integration.dashboardId &&
      installedDashboardIds.includes(integration.dashboardId) &&
      dashboardLocator
    ) {
      listItem.path = dashboardLocator.getRedirectUrl({
        dashboardId: newIntegration.dashboardId,
        timeRange: {
          to,
          from,
        },
      });
    }

    return listItem;
  });

  return {
    listItems,
  };
};
