/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useState, useEffect } from 'react';
import { SavedObjectAttributes } from '@kbn/securitysolution-io-ts-alerting-types';
import { useKibana } from '../../../common/lib/kibana';
import { LinkPanelListItem } from '../../components/link_panel';

const DASHBOARD_REQUEST_BODY_SEARCH = 'Drilldown of Host Risk Score';
export const DASHBOARD_REQUEST_BODY = {
  type: 'dashboard',
  search: DASHBOARD_REQUEST_BODY_SEARCH,
  fields: ['title'],
};

export const useRiskyHostsDashboardLinks = (
  to: string,
  from: string,
  listItems: LinkPanelListItem[]
) => {
  const createDashboardUrl = useKibana().services.dashboard?.dashboardUrlGenerator?.createUrl;
  const savedObjectsClient = useKibana().services.savedObjects.client;

  const [listItemsWithLinks, setListItemsWithLinks] = useState(listItems);

  useEffect(() => {
    if (createDashboardUrl && savedObjectsClient) {
      savedObjectsClient.find<SavedObjectAttributes>(DASHBOARD_REQUEST_BODY).then(
        async (DashboardsSO?: {
          savedObjects?: Array<{
            attributes?: SavedObjectAttributes;
            id?: string;
          }>;
        }) => {
          if (DashboardsSO?.savedObjects?.length) {
            const drilldownDashboardId = DashboardsSO.savedObjects[0].id;
            const dashboardUrls = await Promise.all(
              listItems.map((listItem) =>
                createDashboardUrl({
                  dashboardId: drilldownDashboardId,
                  timeRange: {
                    to,
                    from,
                  },
                  filters: [
                    {
                      meta: {
                        alias: null,
                        disabled: false,
                        negate: false,
                      },
                      query: { match_phrase: { 'host.name': listItem.title } },
                    },
                  ],
                })
              )
            );
            setListItemsWithLinks(
              listItems.map((item, i) => ({ ...item, path: dashboardUrls[i] }))
            );
          }
        }
      );
    }
  }, [createDashboardUrl, from, savedObjectsClient, to, setListItemsWithLinks, listItems]);

  return {
    listItemsWithLinks,
  };
};
