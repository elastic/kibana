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

const getIndexPatternTitleFromTargetIndex = (item: TransformListRow) =>
  Array.isArray(item.config.dest.index) ? item.config.dest.index.join(',') : item.config.dest.index;

export type DiscoverAction = ReturnType<typeof useDiscoverAction>;
export const useDiscoverAction = (forceDisable: boolean) => {
  const appDeps = useAppDependencies();
  const { share } = appDeps;
  const savedObjectsClient = appDeps.savedObjects.client;
  const indexPatterns = appDeps.data.indexPatterns;
  const isDiscoverAvailable = !!appDeps.application.capabilities.discover?.show;

  const { getIndexPatternIdByTitle, loadIndexPatterns } = useSearchItems(undefined);

  const [indexPatternsLoaded, setIndexPatternsLoaded] = useState(false);

  useEffect(() => {
    async function checkIndexPatternAvailability() {
      await loadIndexPatterns(savedObjectsClient, indexPatterns);
      setIndexPatternsLoaded(true);
    }

    checkIndexPatternAvailability();
  }, [indexPatterns, loadIndexPatterns, savedObjectsClient]);

  const clickHandler = useCallback(
    (item: TransformListRow) => {
      const locator = share.url.locators.get(DISCOVER_APP_LOCATOR);
      if (!locator) return;
      const indexPatternTitle = getIndexPatternTitleFromTargetIndex(item);
      const indexPatternId = getIndexPatternIdByTitle(indexPatternTitle);
      locator.navigateSync({
        indexPatternId,
      });
    },
    [getIndexPatternIdByTitle, share]
  );

  const indexPatternExists = useCallback(
    (item: TransformListRow) => {
      const indexPatternTitle = getIndexPatternTitleFromTargetIndex(item);
      const indexPatternId = getIndexPatternIdByTitle(indexPatternTitle);
      return indexPatternId !== undefined;
    },
    [getIndexPatternIdByTitle]
  );

  const action: TransformListAction = useMemo(
    () => ({
      name: (item: TransformListRow) => {
        return <DiscoverActionName items={[item]} indexPatternExists={indexPatternExists(item)} />;
      },
      available: () => isDiscoverAvailable,
      enabled: (item: TransformListRow) =>
        indexPatternsLoaded &&
        !isDiscoverActionDisabled([item], forceDisable, indexPatternExists(item)),
      description: discoverActionNameText,
      icon: 'visTable',
      type: 'icon',
      onClick: clickHandler,
      'data-test-subj': 'transformActionDiscover',
    }),
    [forceDisable, indexPatternExists, indexPatternsLoaded, isDiscoverAvailable, clickHandler]
  );

  return { action };
};
