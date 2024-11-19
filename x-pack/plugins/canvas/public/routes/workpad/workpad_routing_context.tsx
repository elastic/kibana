/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, PropsWithChildren, createContext } from 'react';
import { useRoutingContext } from './hooks/use_routing_context';

export interface WorkpadRoutingContextType {
  gotoPage: (page: number) => void;
  getUrl: (page: number) => string;
  isFullscreen: boolean;
  setFullscreen: (fullscreen: boolean) => void;
  autoplayInterval: number;
  setAutoplayInterval: (interval: number) => void;
  isAutoplayPaused: boolean;
  setIsAutoplayPaused: (isPaused: boolean) => void;
  nextPage: () => void;
  previousPage: () => void;
  refreshInterval: number;
  setRefreshInterval: (interval: number) => void;
  undo: () => void;
  redo: () => void;
}

const basicWorkpadRoutingContext = {
  gotoPage: (page: number) => undefined,
  getUrl: (page: number) => '',
  isFullscreen: false,
  setFullscreen: (fullscreen: boolean) => undefined,
  autoplayInterval: 0,
  setAutoplayInterval: (interval: number) => undefined,
  isAutoplayPaused: true,
  setIsAutoplayPaused: (isPaused: boolean) => undefined,
  nextPage: () => undefined,
  previousPage: () => undefined,
  refreshInterval: 0,
  setRefreshInterval: (interval: number) => undefined,
  undo: () => undefined,
  redo: () => undefined,
};

export const WorkpadRoutingContext = createContext<WorkpadRoutingContextType>(
  basicWorkpadRoutingContext
);

export const WorkpadRoutingContextComponent: FC<PropsWithChildren<unknown>> = ({ children }) => {
  const routingContext = useRoutingContext();

  return (
    <WorkpadRoutingContext.Provider value={routingContext}>
      {children}
    </WorkpadRoutingContext.Provider>
  );
};
