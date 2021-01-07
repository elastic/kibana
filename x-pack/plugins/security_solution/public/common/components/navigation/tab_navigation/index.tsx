/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EuiTab, EuiTabs } from '@elastic/eui';
import { getOr } from 'lodash/fp';
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useHistory } from 'react-router-dom';
import deepEqual from 'fast-deep-equal';

import { APP_ID } from '../../../../../common/constants';
import { track, METRIC_TYPE, TELEMETRY_EVENT } from '../../../lib/telemetry';
import { getSearch } from '../helpers';
import { TabNavigationProps, TabNavigationItemProps } from './types';
import { useKibana } from '../../../lib/kibana';
import { SecurityPageName } from '../../../../app/types';
import { useFormatUrl } from '../../link_to';

const TabNavigationItemComponent = ({
  disabled,
  href,
  hrefWithSearch,
  id,
  name,
  isSelected,
  pageId,
  urlSearch,
}: TabNavigationItemProps) => {
  const history = useHistory();
  const { navigateToApp, getUrlForApp } = useKibana().services.application;
  const { formatUrl } = useFormatUrl(((pageId ?? id) as unknown) as SecurityPageName);
  const handleClick = useCallback(
    (ev) => {
      ev.preventDefault();
      if (id in SecurityPageName && pageId == null) {
        navigateToApp(`${APP_ID}:${id}`, { path: urlSearch });
      } else {
        history.push(hrefWithSearch);
      }
      track(METRIC_TYPE.CLICK, `${TELEMETRY_EVENT.TAB_CLICKED}${id}`);
    },
    [history, hrefWithSearch, id, navigateToApp, pageId, urlSearch]
  );
  const appHref =
    pageId != null
      ? formatUrl(href)
      : getUrlForApp(`${APP_ID}:${id}`, {
          path: urlSearch,
        });
  return (
    <EuiTab
      data-href={appHref}
      data-test-subj={`navigation-${id}`}
      disabled={disabled}
      isSelected={isSelected}
      href={appHref}
      onClick={handleClick}
    >
      {name}
    </EuiTab>
  );
};

const TabNavigationItem = React.memo(TabNavigationItemComponent);

export const TabNavigationComponent: React.FC<TabNavigationProps> = ({
  display,
  filters,
  query,
  navTabs,
  pageName,
  savedQuery,
  sourcerer,
  tabName,
  timeline,
  timerange,
}) => {
  const mapLocationToTab = useCallback(
    (): string =>
      getOr(
        '',
        'id',
        Object.values(navTabs).find(
          (item) =>
            (tabName === item.id && item.pageId != null) ||
            (pageName === item.id && item.pageId == null)
        )
      ),
    [pageName, tabName, navTabs]
  );
  const [selectedTabId, setSelectedTabId] = useState(mapLocationToTab());
  useEffect(() => {
    const currentTabSelected = mapLocationToTab();

    if (currentTabSelected !== selectedTabId) {
      setSelectedTabId(currentTabSelected);
    }

    // we do need navTabs in case the selectedTabId appears after initial load (ex. checking permissions for anomalies)
  }, [pageName, tabName, navTabs, mapLocationToTab, selectedTabId]);

  const renderTabs = useMemo(
    () =>
      Object.values(navTabs).map((tab) => {
        const isSelected = selectedTabId === tab.id;
        const search = getSearch(tab, {
          filters,
          query,
          savedQuery,
          sourcerer,
          timeline,
          timerange,
        });
        const hrefWithSearch =
          tab.href + getSearch(tab, { filters, query, savedQuery, sourcerer, timeline, timerange });

        return (
          <TabNavigationItem
            key={`navigation-${tab.id}`}
            id={tab.id}
            href={tab.href}
            hrefWithSearch={hrefWithSearch}
            name={tab.name}
            disabled={tab.disabled}
            pageId={tab.pageId}
            isSelected={isSelected}
            urlSearch={search}
          />
        );
      }),
    [navTabs, selectedTabId, filters, query, savedQuery, sourcerer, timeline, timerange]
  );

  return <EuiTabs display={display}>{renderTabs}</EuiTabs>;
};

TabNavigationComponent.displayName = 'TabNavigationComponent';

export const TabNavigation = React.memo(
  TabNavigationComponent,
  (prevProps, nextProps) =>
    prevProps.display === nextProps.display &&
    prevProps.pageName === nextProps.pageName &&
    prevProps.savedQuery === nextProps.savedQuery &&
    prevProps.tabName === nextProps.tabName &&
    deepEqual(prevProps.filters, nextProps.filters) &&
    deepEqual(prevProps.query, nextProps.query) &&
    deepEqual(prevProps.navTabs, nextProps.navTabs) &&
    deepEqual(prevProps.sourcerer, nextProps.sourcerer) &&
    deepEqual(prevProps.timeline, nextProps.timeline) &&
    deepEqual(prevProps.timerange, nextProps.timerange)
);

TabNavigation.displayName = 'TabNavigation';
