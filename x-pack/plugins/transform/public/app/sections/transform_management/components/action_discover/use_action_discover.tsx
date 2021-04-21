/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { getDiscoverUrlState, TransformListAction, TransformListRow } from '../../../../common';

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
      const indexPatternTitle = getIndexPatternTitleFromTargetIndex(item);
      const indexPatternId = getIndexPatternIdByTitle(indexPatternTitle);
      const path = `#/?${getDiscoverUrlState(indexPatternId)}`;
      appDeps.application.navigateToApp('discover', { path });
    },
    [appDeps.application, getIndexPatternIdByTitle]
  );

  const action: TransformListAction = useMemo(
    () => ({
      name: (item: TransformListRow) => <DiscoverActionName items={[item]} />,
      enabled: (item: TransformListRow) => {
        const indexPatternTitle = getIndexPatternTitleFromTargetIndex(item);
        const indexPatternId = getIndexPatternIdByTitle(indexPatternTitle);

        const indexPatternExists = indexPatternId !== undefined;

        return (
          indexPatternsLoaded && !isDiscoverActionDisabled([item], forceDisable, indexPatternExists)
        );
      },
      description: discoverActionNameText,
      icon: 'discoverApp',
      type: 'icon',
      onClick: clickHandler,
      'data-test-subj': 'transformActionDiscover',
    }),
    [forceDisable, indexPatternsLoaded, clickHandler, getIndexPatternIdByTitle]
  );

  return { action };
};
