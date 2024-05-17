/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, EuiTab, EuiTabs } from '@elastic/eui';
import deepEqual from 'fast-deep-equal';
import { getOr } from 'lodash/fp';
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';

import { useNavigation } from '../../../lib/kibana';
import { METRIC_TYPE, TELEMETRY_EVENT, track } from '../../../lib/telemetry';
import { BETA } from '../../../translations';
import { useRouteSpy } from '../../../utils/route/use_route_spy';
import type { TabNavigationItemProps, TabNavigationProps } from './types';

const TabNavigationItemComponent = ({
  disabled,
  hrefWithSearch,
  id,
  name,
  isSelected,
  isBeta,
  betaOptions,
}: TabNavigationItemProps) => {
  const { getAppUrl, navigateTo } = useNavigation();

  const handleClick = useCallback(
    (ev) => {
      ev.preventDefault();
      navigateTo({ path: hrefWithSearch, restoreScroll: true });
      track(METRIC_TYPE.CLICK, `${TELEMETRY_EVENT.TAB_CLICKED}${id}`);
    },
    [navigateTo, hrefWithSearch, id]
  );

  const appHref = getAppUrl({
    path: hrefWithSearch,
  });

  return (
    <EuiTab
      data-href={appHref}
      data-test-subj={`navigation-${id}`}
      disabled={disabled}
      isSelected={isSelected}
      href={appHref}
      onClick={handleClick}
      append={isBeta && <EuiBadge color={'#E0E5EE'}>{betaOptions?.text ?? BETA}</EuiBadge>}
      id={id}
    >
      {name}
    </EuiTab>
  );
};

const TabNavigationItem = React.memo(TabNavigationItemComponent);

export const TabNavigationComponent: React.FC<TabNavigationProps> = ({ navTabs }) => {
  const [{ tabName }] = useRouteSpy();
  const mapLocationToTab = useCallback(
    (): string =>
      getOr(
        '',
        'id',
        Object.values(navTabs).find((item) => tabName === item.id)
      ),
    [tabName, navTabs]
  );
  const [selectedTabId, setSelectedTabId] = useState(mapLocationToTab());
  useEffect(() => {
    const currentTabSelected = mapLocationToTab();

    if (currentTabSelected !== selectedTabId) {
      setSelectedTabId(currentTabSelected);
    }

    // we do need navTabs in case the selectedTabId appears after initial load (ex. checking permissions for anomalies)
  }, [tabName, navTabs, mapLocationToTab, selectedTabId]);

  const { search } = useLocation();

  const renderTabs = useMemo(
    () =>
      Object.values(navTabs).map((tab) => {
        const isSelected = selectedTabId === tab.id;
        return (
          <TabNavigationItem
            key={`navigation-${tab.id}`}
            id={tab.id}
            hrefWithSearch={tab.href + search}
            name={tab.name}
            disabled={tab.disabled}
            isSelected={isSelected}
            isBeta={tab.isBeta}
            betaOptions={tab.betaOptions}
          />
        );
      }),
    [navTabs, selectedTabId, search]
  );

  return <EuiTabs>{renderTabs}</EuiTabs>;
};

TabNavigationComponent.displayName = 'TabNavigationComponent';

export const TabNavigation = React.memo(TabNavigationComponent, (prevProps, nextProps) =>
  deepEqual(prevProps.navTabs, nextProps.navTabs)
);

TabNavigation.displayName = 'TabNavigation';
