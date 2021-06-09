/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useHistory } from 'react-router-dom';
import { APP_ID } from '../../../../../common/constants';
import { track, METRIC_TYPE, TELEMETRY_EVENT } from '../../../lib/telemetry';
import { getSearch } from '../helpers';
import { PrimaryNavigationItemsProps } from './types';
import { useKibana } from '../../../lib/kibana';
import { SecurityPageName } from '../../../../app/types';
import { useFormatUrl } from '../../link_to';

export const usePrimaryNavigationItems = ({
  filters,
  navTabs,
  query,
  savedQuery,
  selectedTabId,
  sourcerer,
  timeline,
  timerange,
}: PrimaryNavigationItemsProps) => {
  const history = useHistory();
  const { navigateToApp, getUrlForApp } = useKibana().services.application;

  return Object.values(navTabs).map((tab) => {
    const { id, href, name, disabled, pageId } = tab;
    // Rules of hooks prevents hooks from being called in callbacks as the order of the hooks
    // should be consistent across every render. The primary nav tabs here are from a constants file
    // not dynamically generated, so their order will remain consistent across renders.
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const { formatUrl } = useFormatUrl(((pageId ?? id) as unknown) as SecurityPageName);
    const isSelected = selectedTabId === id;
    const urlSearch = getSearch(tab, {
      filters,
      query,
      savedQuery,
      sourcerer,
      timeline,
      timerange,
    });
    const hrefWithSearch =
      tab.href + getSearch(tab, { filters, query, savedQuery, sourcerer, timeline, timerange });

    const handleClick = (ev: React.MouseEvent) => {
      ev.preventDefault();
      if (id in SecurityPageName && pageId == null) {
        // TODO: [1101] remove condition and use deepLinkId for all sections when all migrated
        if (id === 'overview') {
          navigateToApp(APP_ID, { deepLinkId: id, path: urlSearch });
        } else {
          navigateToApp(`${APP_ID}:${id}`, { path: urlSearch });
        }
      } else {
        history.push(hrefWithSearch);
      }
      track(METRIC_TYPE.CLICK, `${TELEMETRY_EVENT.TAB_CLICKED}${id}`);
    };

    const appHref =
      pageId != null
        ? formatUrl(href)
        : getUrlForApp(`${APP_ID}:${id}`, {
            path: urlSearch,
          });

    return {
      'data-href': appHref,
      'data-test-subj': `navigation-${id}`,
      disabled,
      href: appHref,
      id,
      isSelected,
      name,
      onClick: handleClick,
    };
  });
};
