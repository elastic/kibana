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

export const getInstalledCtiTitles = (installedIntegrationsId: string[]) =>
  Object.entries(CTI_DATASET_KEY_MAP)
    .filter(([title, dataset]) => {
      const moduleId = dataset.split('.')[0];
      return installedIntegrationsId.includes(moduleId);
    })
    .map(([title, dataset]) => title);

export const getEmptyList = (installedIntegrationsId: string[]): LinkPanelListItem[] =>
  getInstalledCtiTitles(installedIntegrationsId).map((title) => ({
    title,
    count: 0,
    path: '',
  }));

const TAG_REQUEST_BODY_SEARCH = 'threat intel';
export const TAG_REQUEST_BODY = {
  type: 'tag',
  search: TAG_REQUEST_BODY_SEARCH,
  searchFields: ['name'],
};

export const DASHBOARD_SO_TITLE_PREFIX = '[Filebeat Threat Intel] ';
export const OVERVIEW_DASHBOARD_LINK_TITLE = 'Overview';

export const getCtiListItemsWithoutLinks = (
  eventCounts: EventCounts,
  installedIntegrationsId: string[]
): LinkPanelListItem[] => {
  return getEmptyList(installedIntegrationsId).map((item) => ({
    ...item,
    count: eventCounts[CTI_DATASET_KEY_MAP[item.title]] ?? 0,
  }));
};

export const isOverviewItem = (item: { path?: string; title?: string }) =>
  item.title === OVERVIEW_DASHBOARD_LINK_TITLE;

export const createLinkFromDashboardSO = (
  dashboardSO: { attributes?: SavedObjectAttributes },
  eventCountsByDataset: EventCounts,
  path: string
) => {
  const title =
    typeof dashboardSO.attributes?.title === 'string'
      ? dashboardSO.attributes.title.replace(DASHBOARD_SO_TITLE_PREFIX, '')
      : undefined;
  return {
    title,
    count: typeof title === 'string' ? eventCountsByDataset[CTI_DATASET_KEY_MAP[title]] : undefined,
    path,
  };
};

export const emptyEventCountsByDataset = Object.values(CTI_DATASET_KEY_MAP).reduce((acc, id) => {
  acc[id] = 0;
  return acc;
}, {} as { [key: string]: number });
