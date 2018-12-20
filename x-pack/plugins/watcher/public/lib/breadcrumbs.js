/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import chrome from 'ui/chrome';
import { i18n } from '@kbn/i18n';

import { MANAGEMENT_BREADCRUMB } from 'ui/management';

const uiSettings = chrome.getUiSettingsClient();

export function getWatchListBreadcrumbs() {
  return [
    MANAGEMENT_BREADCRUMB,
    {
      text: i18n.translate('xpack.watcher.list.breadcrumb', {
        defaultMessage: 'Watcher'
      }),
      href: '#/management/elasticsearch/watcher/watches/'
    }
  ];
}

export function getWatchDetailBreadcrumbs($route) {
  const watch = $route.current.locals.watch || $route.current.locals.xpackWatch;

  return [
    ...getWatchListBreadcrumbs(),
    {
      text: !watch.isNew
        ? watch.name
        : i18n.translate('xpack.watcher.create.breadcrumb', { defaultMessage: 'Create' }),
      href: '#/management/elasticsearch/watcher/watches/watch/23eebf28-94fd-47e9-ac44-6fee6e427c33'
    }
  ];
}

export function getWatchHistoryBreadcrumbs($route) {
  const { watchHistoryItem } = $route.current.locals;

  return [
    ...getWatchDetailBreadcrumbs($route),
    {
      text: watchHistoryItem.startTime.format(uiSettings.get('dateFormat'))
    }
  ];
}
