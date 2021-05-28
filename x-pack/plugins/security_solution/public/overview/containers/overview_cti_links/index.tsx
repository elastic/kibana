/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useEffect, useState, useMemo } from 'react';
import { SavedObjectAttributes } from '@kbn/securitysolution-io-ts-alerting-types';
import { usePrevious } from 'react-use';
import { useKibana } from '../../../common/lib/kibana';
import { useCTIEventCounts } from './get_event_counts';
import { ThreatIntelLinkPanelProps } from '../../components/overview_cti_links';
import { makeMapStateToProps } from '../../../common/components/url_state/helpers';
import { useDeepEqualSelector } from '../../../common/hooks/use_selector';
import { CONSTANTS } from '../../../common/components/url_state/constants';

const DASHBOARD_SO_TITLE_PREFIX = '[Filebeat Threat Intel] ';
const BUTTON_LINK_TITLE = 'Overview';
const TAG_REQUEST_BODY = {
  type: 'tag',
  search: 'threat intel',
  searchFields: ['name'],
};

export interface DashboardLink {
  path: string;
  title: string;
  count: number;
}

interface ButtonLink {
  path: string;
}

const isDashboardLink = (link: DashboardLink | Partial<DashboardLink>): link is DashboardLink =>
  typeof link.title === 'string' && typeof link.path === 'string' && typeof link.count === 'number';

const isButtonLink = (link: { path?: string; title?: string }) => link.title === BUTTON_LINK_TITLE;

export const useThreatIntelDashboardLinks = (props: ThreatIntelLinkPanelProps) => {
  const savedObjectsClient = useKibana().services.savedObjects.client;

  const mapState = makeMapStateToProps();
  const { urlState } = useDeepEqualSelector(mapState);
  const timeRange = useMemo(() => urlState[CONSTANTS.timerange].global[CONSTANTS.timerange], [
    urlState,
  ]);
  const createUrl = useKibana().services.dashboard.dashboardUrlGenerator?.createUrl;
  const { eventCounts, total } = useCTIEventCounts(props);

  const [buttonLink, setButtonLink] = useState<Partial<ButtonLink> | null>(null);
  const [dashboardLinks, setDashboardLinks] = useState<DashboardLink[]>([]);

  const prevTotal = usePrevious(total);

  useEffect(() => {
    if (savedObjectsClient && total && total !== prevTotal) {
      savedObjectsClient
        .find<SavedObjectAttributes>(TAG_REQUEST_BODY)
        .then((TagsSO) => {
          if (TagsSO.savedObjects?.length) {
            return savedObjectsClient.find<SavedObjectAttributes>({
              type: 'dashboard',
              hasReference: { id: TagsSO.savedObjects[0].id, type: 'tag' },
            });
          }
        })
        .then(async (DashboardsSO) => {
          if (DashboardsSO?.savedObjects?.length && createUrl) {
            const dashboardUrls = await Promise.all(
              DashboardsSO.savedObjects.map((SO) => createUrl({ dashboardId: SO.id, timeRange }))
            ).then((values) => values);
            const links = DashboardsSO.savedObjects.reduce((acc, dashboardSO, i) => {
              const title =
                typeof dashboardSO.attributes.title === 'string'
                  ? dashboardSO.attributes.title.replace(DASHBOARD_SO_TITLE_PREFIX, '')
                  : undefined;
              const count =
                typeof title === 'string'
                  ? eventCounts[title.replace(' ', '').toLowerCase()]
                  : undefined;
              const link = {
                title,
                count,
                path: dashboardUrls[i],
              };
              if (isButtonLink(link)) {
                setButtonLink(link);
              } else if (isDashboardLink(link)) {
                acc.push(link);
              }
              return acc;
            }, [] as DashboardLink[]);
            setDashboardLinks(links);
          }
        });
    }
  }, [eventCounts, prevTotal, savedObjectsClient, timeRange, total, createUrl]);

  return {
    buttonLink,
    dashboardLinks,
    totalEventCount: total,
  };
};
