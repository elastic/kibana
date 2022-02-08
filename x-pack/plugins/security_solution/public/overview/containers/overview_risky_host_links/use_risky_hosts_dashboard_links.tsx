/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useState, useEffect } from 'react';
import { useKibana } from '../../../common/lib/kibana';
import { LinkPanelListItem } from '../../components/link_panel';
import { useRiskyHostsDashboardId } from './use_risky_hosts_dashboard_id';

export const useRiskyHostsDashboardLinks = (
  to: string,
  from: string,
  listItems: LinkPanelListItem[]
) => {
  const { dashboard } = useKibana().services;

  const dashboardId = useRiskyHostsDashboardId();
  const [listItemsWithLinks, setListItemsWithLinks] = useState<LinkPanelListItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    const createLinks = async () => {
      if (dashboard?.locator && dashboardId) {
        const dashboardUrls = await Promise.all(
          listItems.reduce(
            (acc: Array<Promise<string>>, listItem) =>
              dashboard && dashboard.locator
                ? [
                    ...acc,
                    dashboard.locator.getUrl({
                      dashboardId,
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
                    }),
                  ]
                : acc,
            []
          )
        );
        if (!cancelled && dashboardUrls.length) {
          setListItemsWithLinks(
            listItems.map((item, i) => ({
              ...item,
              path: dashboardUrls[i],
            }))
          );
        }
      } else {
        setListItemsWithLinks(listItems);
      }
    };
    createLinks();
    return () => {
      cancelled = true;
    };
  }, [dashboard, dashboardId, from, listItems, to]);

  return { listItemsWithLinks };
};
