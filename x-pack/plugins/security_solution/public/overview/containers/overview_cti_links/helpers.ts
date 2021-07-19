/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectAttributes } from '@kbn/securitysolution-io-ts-alerting-types';
import { CTI_DEFAULT_SOURCES } from '../../../../common/cti/constants';

export interface CtiListItem {
  path: string;
  title: string;
  count: number;
}

export const EMPTY_LIST_ITEMS: CtiListItem[] = CTI_DEFAULT_SOURCES.map((item) => ({
  title: item,
  count: 0,
  path: '',
}));

const TAG_REQUEST_BODY_SEARCH = 'threat intel';
export const TAG_REQUEST_BODY = {
  type: 'tag',
  search: TAG_REQUEST_BODY_SEARCH,
  searchFields: ['name'],
};

export interface EventCounts {
  [key: string]: number;
}

export const DASHBOARD_SO_TITLE_PREFIX = '[Filebeat Threat Intel] ';
export const OVERVIEW_DASHBOARD_LINK_TITLE = 'Overview';

export const getListItemsWithoutLinks = (eventCounts: EventCounts): CtiListItem[] => {
  return EMPTY_LIST_ITEMS.map((item) => ({
    ...item,
    count: eventCounts[item.title.replace(' ', '').toLowerCase()] ?? 0,
  }));
};

export const isCtiListItem = (item: CtiListItem | Partial<CtiListItem>): item is CtiListItem =>
  typeof item.title === 'string' && typeof item.path === 'string' && typeof item.count === 'number';

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
    count:
      typeof title === 'string'
        ? eventCountsByDataset[title.replace(' ', '').toLowerCase()]
        : undefined,
    path,
  };
};

export const emptyEventCountsByDataset = CTI_DEFAULT_SOURCES.reduce((acc, item) => {
  acc[item.toLowerCase().replace(' ', '')] = 0;
  return acc;
}, {} as { [key: string]: number });
