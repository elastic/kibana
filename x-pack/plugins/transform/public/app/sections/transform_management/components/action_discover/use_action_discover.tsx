/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { DISCOVER_APP_LOCATOR } from '../../../../../../../../../src/plugins/discover/public';

import { TransformListAction, TransformListRow } from '../../../../common';

import { useSearchItems } from '../../../../hooks/use_search_items';
import { useAppDependencies } from '../../../../app_dependencies';

import {
  isDiscoverActionDisabled,
  discoverActionNameText,
  DiscoverActionName,
} from './discover_action_name';

const getDataViewTitleFromTargetIndex = (item: TransformListRow) =>
  Array.isArray(item.config.dest.index) ? item.config.dest.index.join(',') : item.config.dest.index;

export type DiscoverAction = ReturnType<typeof useDiscoverAction>;
export const useDiscoverAction = (forceDisable: boolean) => {
  const appDeps = useAppDependencies();
  const { share } = appDeps;
  const savedObjectsClient = appDeps.savedObjects.client;
  const dataViews = appDeps.data.dataViews;
  const isDiscoverAvailable = !!appDeps.application.capabilities.discover?.show;

  const { getDataViewIdByTitle, loadDataViews } = useSearchItems(undefined);

  const [dataViewsLoaded, setDataViewsLoaded] = useState(false);

  useEffect(() => {
    async function checkDataViewAvailability() {
      await loadDataViews(savedObjectsClient, dataViews);
      setDataViewsLoaded(true);
    }

    checkDataViewAvailability();
  }, [dataViews, loadDataViews, savedObjectsClient]);

  const clickHandler = useCallback(
    (item: TransformListRow) => {
      const locator = share.url.locators.get(DISCOVER_APP_LOCATOR);
      if (!locator) return;
      const dataViewTitle = getDataViewTitleFromTargetIndex(item);
      const dataViewId = getDataViewIdByTitle(dataViewTitle);
      locator.navigateSync({
        indexPatternId: dataViewId,
      });
    },
    [getDataViewIdByTitle, share]
  );

  const dataViewExists = useCallback(
    (item: TransformListRow) => {
      const dataViewTitle = getDataViewTitleFromTargetIndex(item);
      const dataViewId = getDataViewIdByTitle(dataViewTitle);
      return dataViewId !== undefined;
    },
    [getDataViewIdByTitle]
  );

  const action: TransformListAction = useMemo(
    () => ({
      name: (item: TransformListRow) => {
        return <DiscoverActionName items={[item]} dataViewExists={dataViewExists(item)} />;
      },
      available: () => isDiscoverAvailable,
      enabled: (item: TransformListRow) =>
        dataViewsLoaded && !isDiscoverActionDisabled([item], forceDisable, dataViewExists(item)),
      description: discoverActionNameText,
      icon: 'visTable',
      type: 'icon',
      onClick: clickHandler,
      'data-test-subj': 'transformActionDiscover',
    }),
    [forceDisable, dataViewExists, dataViewsLoaded, isDiscoverAvailable, clickHandler]
  );

  return { action };
};
