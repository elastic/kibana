/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { ChromeBreadcrumb } from 'src/core/public';

import { BASE_PATH } from '../../../common/constants';
import type { Page, DynamicPagePathValues } from '../page_paths';
import { pagePathGetters } from '../page_paths';

import { useKibana } from '../lib/kibana';

const BASE_BREADCRUMB: ChromeBreadcrumb = {
  href: pagePathGetters.overview(),
  text: i18n.translate('xpack.osquery.breadcrumbs.appTitle', {
    defaultMessage: 'Osquery',
  }),
};

const breadcrumbGetters: {
  [key in Page]?: (values: DynamicPagePathValues) => ChromeBreadcrumb[];
} = {
  base: () => [BASE_BREADCRUMB],
  overview: () => [
    BASE_BREADCRUMB,
    {
      text: i18n.translate('xpack.osquery.breadcrumbs.overviewPageTitle', {
        defaultMessage: 'Overview',
      }),
    },
  ],
  live_queries: () => [
    BASE_BREADCRUMB,
    {
      text: i18n.translate('xpack.osquery.breadcrumbs.liveQueriesPageTitle', {
        defaultMessage: 'Live queries',
      }),
    },
  ],
  live_query_new: () => [
    BASE_BREADCRUMB,
    {
      href: pagePathGetters.live_queries(),
      text: i18n.translate('xpack.osquery.breadcrumbs.liveQueriesPageTitle', {
        defaultMessage: 'Live queries',
      }),
    },
    {
      text: i18n.translate('xpack.osquery.breadcrumbs.newLiveQueryPageTitle', {
        defaultMessage: 'New',
      }),
    },
  ],
  live_query_details: ({ liveQueryId }) => [
    BASE_BREADCRUMB,
    {
      href: pagePathGetters.live_queries(),
      text: i18n.translate('xpack.osquery.breadcrumbs.liveQueriesPageTitle', {
        defaultMessage: 'Live queries',
      }),
    },
    {
      text: liveQueryId,
    },
  ],
  scheduled_query_groups: () => [
    BASE_BREADCRUMB,
    {
      text: i18n.translate('xpack.osquery.breadcrumbs.scheduledQueryGroupsPageTitle', {
        defaultMessage: 'Scheduled query groups',
      }),
    },
  ],
  scheduled_query_group_add: () => [
    BASE_BREADCRUMB,
    {
      href: pagePathGetters.scheduled_query_groups(),
      text: i18n.translate('xpack.osquery.breadcrumbs.scheduledQueryGroupsPageTitle', {
        defaultMessage: 'Scheduled query groups',
      }),
    },
    {
      text: i18n.translate('xpack.osquery.breadcrumbs.addScheduledQueryGroupsPageTitle', {
        defaultMessage: 'Add',
      }),
    },
  ],
  scheduled_query_group_details: ({ scheduledQueryGroupName }) => [
    BASE_BREADCRUMB,
    {
      href: pagePathGetters.scheduled_query_groups(),
      text: i18n.translate('xpack.osquery.breadcrumbs.scheduledQueryGroupsPageTitle', {
        defaultMessage: 'Scheduled query groups',
      }),
    },
    {
      text: scheduledQueryGroupName,
    },
  ],
  scheduled_query_group_edit: ({ scheduledQueryGroupName, scheduledQueryGroupId }) => [
    BASE_BREADCRUMB,
    {
      href: pagePathGetters.scheduled_query_groups(),
      text: i18n.translate('xpack.osquery.breadcrumbs.scheduledQueryGroupsPageTitle', {
        defaultMessage: 'Scheduled query groups',
      }),
    },
    {
      href: pagePathGetters.scheduled_query_group_details({ scheduledQueryGroupId }),
      text: scheduledQueryGroupName,
    },
    {
      text: i18n.translate('xpack.osquery.breadcrumbs.editScheduledQueryGroupsPageTitle', {
        defaultMessage: 'Edit',
      }),
    },
  ],
};

export function useBreadcrumbs(page: Page, values: DynamicPagePathValues = {}) {
  const { chrome, http } = useKibana().services;
  const breadcrumbs: ChromeBreadcrumb[] =
    breadcrumbGetters[page]?.(values).map((breadcrumb) => ({
      ...breadcrumb,
      href: breadcrumb.href ? http.basePath.prepend(`${BASE_PATH}${breadcrumb.href}`) : undefined,
    })) || [];
  const docTitle: string[] = [...breadcrumbs]
    .reverse()
    .map((breadcrumb) => breadcrumb.text as string);
  chrome.docTitle.change(docTitle);
  chrome.setBreadcrumbs(breadcrumbs);
}
