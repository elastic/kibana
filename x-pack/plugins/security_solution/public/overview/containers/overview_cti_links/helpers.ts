/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectAttributes } from '@kbn/securitysolution-io-ts-alerting-types';
import { CTI_DATASET_KEY_MAP } from '../../../../common/cti/constants';
import { LinkPanelListItem } from '../../components/link_panel';
import { EventCounts } from '../../components/link_panel/helpers';

interface Integration {
  id: string;
  path?: string;
}

export const getInstalledCtiDatastreams = (
  installedIntegrations: Integration[]
): Array<Integration & { title: string }> =>
  Object.entries(CTI_DATASET_KEY_MAP)
    .map(([title, dataset]) => {
      const moduleId = dataset.split('.')[0];
      const integration = installedIntegrations.find((item) => item.id === moduleId);
      if (!integration) {
        return false;
      } else {
        return {
          ...integration,
          title,
        };
      }
    })
    .filter((integration) => integration) as Array<Integration & { title: string }>;

export const getEmptyList = (installedIntegrations: Integration[]): LinkPanelListItem[] =>
  getInstalledCtiDatastreams(installedIntegrations).map((integration) => ({
    title: integration.title,
    count: 0,
    path: integration.path || '',
  }));

const TAG_REQUEST_BODY_SEARCH = 'threat intel';
export const TAG_REQUEST_BODY = {
  type: 'tag',
  search: TAG_REQUEST_BODY_SEARCH,
  searchFields: ['name'],
};

export const DASHBOARD_SO_TITLE_PREFIX = '[Filebeat Threat Intel] ';
export const OVERVIEW_DASHBOARD_LINK_TITLE = 'Overview';

export const getCtiListItems = (
  eventCounts: EventCounts,
  installedIntegrations: Integration[]
): LinkPanelListItem[] => {
  return getEmptyList(installedIntegrations).map((item) => ({
    ...item,
    count: eventCounts[CTI_DATASET_KEY_MAP[item.title]] ?? 0,
  }));
};

export const isOverviewItem = (item: { path?: string; title?: string }) =>
  item.title === OVERVIEW_DASHBOARD_LINK_TITLE;

export const emptyEventCountsByDataset = Object.values(CTI_DATASET_KEY_MAP).reduce((acc, id) => {
  acc[id] = 0;
  return acc;
}, {} as { [key: string]: number });
