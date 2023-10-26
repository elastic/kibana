/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DiscoverStateContainer } from '@kbn/discover-plugin/public';
import type { PropsWithChildren, FC } from 'react';
import React, { useCallback, useRef, useMemo } from 'react';
import { DiscoverInTimelineContext } from './context';
import { useDiscoverInTimelineActions } from './use_discover_in_timeline_actions';

type DiscoverInTimelineContextProviderProps = PropsWithChildren<{}>;

export const DiscoverInTimelineContextProvider: FC<DiscoverInTimelineContextProviderProps> = (
  props
) => {
  const discoverStateContainer = useRef<DiscoverStateContainer>();

  const actions = useDiscoverInTimelineActions(discoverStateContainer);

  const setDiscoverStateContainer = useCallback((stateContainer: DiscoverStateContainer) => {
    discoverStateContainer.current = stateContainer;
  }, []);

  const discoverInTimelineContext = useMemo(() => {
    return {
      discoverStateContainer,
      setDiscoverStateContainer,
      ...actions,
    };
  }, [actions, setDiscoverStateContainer]);

  return (
    <DiscoverInTimelineContext.Provider value={discoverInTimelineContext}>
      {props.children}
    </DiscoverInTimelineContext.Provider>
  );
};
