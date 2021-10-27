/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useState, useEffect, useCallback } from 'react';
import { SavedObjectAttributes } from '@kbn/securitysolution-io-ts-alerting-types';
import { useKibana } from '../../../common/lib/kibana';
import {
  TAG_REQUEST_BODY,
  createLinkFromDashboardSO,
  getCtiListItemsWithoutLinks,
  isOverviewItem,
  getEmptyList,
} from './helpers';
import { LinkPanelListItem, isLinkPanelListItem } from '../../components/link_panel';

export const useCtiDashboardLinks = (
  eventCountsByDataset: { [key: string]: number },
  to: string,
  from: string,
  installedIntegrationIds: string[] = []
) => {
  const createDashboardUrl = useKibana().services.dashboard?.dashboardUrlGenerator?.createUrl;
  const savedObjectsClient = useKibana().services.savedObjects.client;

  const [buttonHref, setButtonHref] = useState<string | undefined>();
  const [listItems, setListItems] = useState<LinkPanelListItem[]>(
    getEmptyList(installedIntegrationIds)
  );

  const [isPluginDisabled, setIsDashboardPluginDisabled] = useState(false);
  const handleDisabledPlugin = useCallback(() => {
    if (!isPluginDisabled) {
      setIsDashboardPluginDisabled(true);
    }
    setListItems(getCtiListItemsWithoutLinks(eventCountsByDataset, installedIntegrationIds));
  }, [
    setIsDashboardPluginDisabled,
    setListItems,
    eventCountsByDataset,
    installedIntegrationIds,
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
                  })
                )
              );
              const items = DashboardsSO.savedObjects
                ?.reduce((acc: LinkPanelListItem[], dashboardSO, i) => {
                  const item = createLinkFromDashboardSO(
                    dashboardSO,
                    eventCountsByDataset,
                    dashboardUrls[i]
                  );
                  if (isOverviewItem(item)) {
                    setButtonHref(item.path);
                  } else if (isLinkPanelListItem(item)) {
                    acc.push(item);
                  }
                  return acc;
                }, [])
                .sort((a, b) => (a.title > b.title ? 1 : -1));
              setListItems(items);
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
  ]);

  return {
    buttonHref,
    isPluginDisabled,
    listItems,
  };
};
