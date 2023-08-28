/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DiscoverStateContainer } from '@kbn/discover-plugin/public';
import type { PropsWithChildren, FC } from 'react';
import React, { useCallback, useRef } from 'react';
import { DiscoverInTimelineContext } from './context';

type DiscoverInTimelineContextProviderProps = PropsWithChildren<{}>;

export const DiscoverInTimelineContextProvider: FC<DiscoverInTimelineContextProviderProps> = (
  props
) => {
  const discoverStateContainer = useRef<DiscoverStateContainer>();

  const setDiscoverStateContainer = useCallback((stateContainer: DiscoverStateContainer) => {
    discoverStateContainer.current = stateContainer;
  }, []);

  return (
    <DiscoverInTimelineContext.Provider
      value={{
        discoverStateContainer,
        setDiscoverStateContainer,
      }}
    >
      {props.children}
    </DiscoverInTimelineContext.Provider>
  );
};
