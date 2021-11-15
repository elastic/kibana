/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useState, useEffect, useCallback } from 'react';
import { SavedObjectAttributes } from '@kbn/securitysolution-io-ts-alerting-types';
import { useKibana } from '../../../common/lib/kibana';
import { TAG_REQUEST_BODY, getCtiListItems, getEmptyList } from './helpers';
import { LinkPanelListItem } from '../../components/link_panel';

interface Integration {
  id: string;
  dashboardIds: string[];
}

export const useCtiDashboardLinks = (
  eventCountsByDataset: { [key: string]: number },
  to: string,
  from: string,
  installedIntegrations: Integration[] = []
) => {
  const createDashboardUrl = useKibana().services.dashboard?.dashboardUrlGenerator?.createUrl;
  const savedObjectsClient = useKibana().services.savedObjects.client;

  const [listItems, setListItems] = useState<LinkPanelListItem[]>(
    getEmptyList(installedIntegrations)
  );

  const [isPluginDisabled, setIsDashboardPluginDisabled] = useState(false);
  const handleDisabledPlugin = useCallback(() => {
    if (!isPluginDisabled) {
      setIsDashboardPluginDisabled(true);
    }
    setListItems(getCtiListItems(eventCountsByDataset, installedIntegrations));
  }, [
    setIsDashboardPluginDisabled,
    setListItems,
    eventCountsByDataset,
    installedIntegrations,
    isPluginDisabled,
  ]);

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
    if (!createDashboardUrl || !savedObjectsClient) {
      handleDisabledPlugin();
    } else {
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
              const dashboardUrls = await Promise.all(
                DashboardsSO.savedObjects.map((SO) =>
                  createDashboardUrl({
                    dashboardId: SO.id,
                    timeRange: {
                      to,
                      from,
                    },
                  }).then((url) => ({
                    url,
                    id: SO.id,
                  }))
                )
              );

              const integrationsWithPath = installedIntegrations.map((integration) => {
                const integrationDashboards = integration.dashboardIds?.map((dashboardId) => {
                  const dashboardFromSavedObjects = DashboardsSO.savedObjects?.find(
                    (SO) => dashboardId === SO.id
                  );
                  return dashboardFromSavedObjects;
                });
                let overviewDashboard = integrationDashboards.find((dashboard) =>
                  (dashboard?.attributes?.title ?? '').toString().includes('Overview')
                );
                if (!overviewDashboard) {
                  overviewDashboard = integrationDashboards[0];
                }
                const overviewDashboardUrl = dashboardUrls.find(
                  (dashboardUrl) => dashboardUrl?.id === overviewDashboard?.id
                )?.url;
                return {
                  ...integration,
                  path: overviewDashboardUrl,
                };
              });
              setListItems(getCtiListItems(eventCountsByDataset, integrationsWithPath));
            } else {
              handleDisabledPlugin();
            }
          }
        );
    }
  }, [
    createDashboardUrl,
    eventCountsByDataset,
    from,
    handleDisabledPlugin,
    handleTagsReceived,
    isPluginDisabled,
    savedObjectsClient,
    to,
    installedIntegrations,
  ]);

  return {
    isPluginDisabled,
    listItems,
  };
};
