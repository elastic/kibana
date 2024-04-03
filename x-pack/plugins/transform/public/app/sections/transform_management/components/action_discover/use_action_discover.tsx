/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { DISCOVER_APP_LOCATOR } from '@kbn/discover-plugin/common';
import type { TransformListAction, TransformListRow } from '../../../../common';

import { useSearchItems } from '../../../../hooks/use_search_items';
import { useAppDependencies } from '../../../../app_dependencies';

import {
  isDiscoverActionDisabled,
  discoverActionNameText,
  DiscoverActionName,
} from './discover_action_name';

export type DiscoverAction = ReturnType<typeof useDiscoverAction>;
export const useDiscoverAction = (forceDisable: boolean) => {
  const {
    share,
    data: { dataViews: dataViewsContract },
    application: { capabilities },
  } = useAppDependencies();
  const isDiscoverAvailable = !!capabilities.discover?.show;

  const { getDataViewIdByTitle, loadDataViews } = useSearchItems(undefined);

  const [dataViewsLoaded, setDataViewsLoaded] = useState(false);

  useEffect(() => {
    async function checkDataViewAvailability() {
      await loadDataViews(dataViewsContract);
      setDataViewsLoaded(true);
    }

    checkDataViewAvailability();
  }, [loadDataViews, dataViewsContract]);

  const clickHandler = useCallback(
    (item: TransformListRow) => {
      const locator = share.url.locators.get(DISCOVER_APP_LOCATOR);
      if (!locator) return;
      const dataViewId = getDataViewIdByTitle(item.config.dest.index);
      locator.navigateSync({
        indexPatternId: dataViewId,
      });
    },
    [getDataViewIdByTitle, share]
  );

  const dataViewExists = useCallback(
    (item: TransformListRow) => {
      const dataViewId = getDataViewIdByTitle(item.config.dest.index);
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
