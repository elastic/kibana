/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';

import {
  DiscoverUrlGeneratorState,
  DISCOVER_APP_URL_GENERATOR,
} from '../../../../../../../../../src/plugins/discover/public';

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
  const savedObjectsClient = appDeps.savedObjects.client;
  const indexPatterns = appDeps.data.indexPatterns;
  const { getUrlGenerator } = appDeps.share.urlGenerators;
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
    async (item: TransformListRow) => {
      let discoverUrlGenerator;
      try {
        discoverUrlGenerator = getUrlGenerator(DISCOVER_APP_URL_GENERATOR);
      } catch (error) {
        // ignore error thrown when url generator is not available
        return;
      }

      const indexPatternTitle = getIndexPatternTitleFromTargetIndex(item);
      const indexPatternId = getIndexPatternIdByTitle(indexPatternTitle);
      const state: DiscoverUrlGeneratorState = {
        indexPatternId,
      };
      const path = await discoverUrlGenerator.createUrl(state);
      appDeps.application.navigateToApp('discover', { path });
    },
    [appDeps.application, getIndexPatternIdByTitle, getUrlGenerator]
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
