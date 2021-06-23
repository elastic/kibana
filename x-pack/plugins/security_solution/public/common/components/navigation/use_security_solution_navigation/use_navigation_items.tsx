/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { APP_ID } from '../../../../../common/constants';
import { track, METRIC_TYPE, TELEMETRY_EVENT } from '../../../lib/telemetry';
import { getSearch } from '../helpers';
import { PrimaryNavigationItemsProps } from './types';
import { useKibana } from '../../../lib/kibana';

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
  const { navigateToApp, getUrlForApp } = useKibana().services.application;

  const navItems = Object.values(navTabs).map((tab) => {
    const { id, name, disabled } = tab;
    const isSelected = selectedTabId === id;
    const urlSearch = getSearch(tab, {
      filters,
      query,
      savedQuery,
      sourcerer,
      timeline,
      timerange,
    });

    const handleClick = (ev: React.MouseEvent) => {
      ev.preventDefault();
      navigateToApp(`${APP_ID}:${id}`, { path: urlSearch });
      track(METRIC_TYPE.CLICK, `${TELEMETRY_EVENT.TAB_CLICKED}${id}`);
    };

    const appHref = getUrlForApp(`${APP_ID}:${id}`, { path: urlSearch });

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

  return [
    {
      id: APP_ID, // TODO: When separating into sub-sections (detect, explore, investigate). Those names can also serve as the section id
      items: navItems,
      name: '',
    },
  ];
};
