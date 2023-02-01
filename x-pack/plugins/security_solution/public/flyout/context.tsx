/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { noop } from 'lodash/fp';
import type { FlyoutLayout, FlyoutPanel } from '@kbn/expandable-flyout';
import {
  closeFlyoutLeftPanel,
  closeFlyout,
  closeFlyoutPreviewPanel,
  closeFlyoutRightPanel,
  openFlyout,
  openFlyoutLeftPanel,
  openFlyoutPreviewPanel,
  openFlyoutRightPanel,
  previousFlyoutPreviewPanel,
} from '@kbn/expandable-flyout';

export interface ExpandableFlyoutContext {
  /**
   *
   */
  close: () => void;
  /**
   *
   */
  panels: FlyoutLayout;
  /**
   *
   */
  scope: string;
  /**
   *
   */
  openPanels: (panels: { left?: FlyoutPanel; right?: FlyoutPanel; preview?: FlyoutPanel }) => void;
  /**
   *
   */
  openRightPanel: (panel: FlyoutPanel) => void;
  /**
   *
   */
  openLeftPanel: (panel: FlyoutPanel) => void;
  /**
   *
   */
  openPreviewPanel: (panel: FlyoutPanel) => void;
  /**
   *
   */
  closeRightPanel: () => void;
  /**
   *
   */
  closeLeftPanel: () => void;
  /**
   *
   */
  closePreviewPanel: () => void;
  /**
   *
   */
  previousPreviewPanel: () => void;
  /**
   *
   */
  closePanels: () => void;
}

export const ExpandableFlyoutContext = createContext<ExpandableFlyoutContext>({
  panels: {
    left: {},
    right: {},
    preview: [],
  },
  scope: '',
  openPanels: noop,
  openRightPanel: noop,
  openLeftPanel: noop,
  openPreviewPanel: noop,
  closeRightPanel: noop,
  closeLeftPanel: noop,
  closePreviewPanel: noop,
  closePanels: noop,
  previousPreviewPanel: noop,
  close: noop,
});

export interface ExpandableFlyoutProviderProps {
  /**
   *
   */
  layout: FlyoutLayout;
  /**
   *
   */
  scope: string;
  /**
   *
   */
  children: React.ReactNode;
  /**
   *
   */
  close: () => void;
}

export const ExpandableFlyoutProvider = ({
  layout,
  scope,
  children,
  close,
}: ExpandableFlyoutProviderProps) => {
  const [panels, setPanels] = useState(layout);
  const dispatch = useDispatch();

  const openPanels = useCallback(
    ({
      right,
      left,
      preview,
    }: {
      right?: FlyoutPanel;
      left?: FlyoutPanel;
      preview?: FlyoutPanel;
    }) => dispatch(openFlyout({ scope, left, right, preview })),
    [dispatch, scope]
  );

  const openRightPanel = useCallback(
    (panel: FlyoutPanel) => dispatch(openFlyoutRightPanel({ scope, panel })),
    [dispatch, scope]
  );

  const openLeftPanel = useCallback(
    (panel: FlyoutPanel) => dispatch(openFlyoutLeftPanel({ scope, panel })),
    [dispatch, scope]
  );

  const openPreviewPanel = useCallback(
    (panel: FlyoutPanel) => dispatch(openFlyoutPreviewPanel({ scope, panel })),
    [dispatch, scope]
  );

  const closeRightPanel = useCallback(
    () => dispatch(closeFlyoutRightPanel({ scope })),
    [dispatch, scope]
  );

  const closeLeftPanel = useCallback(
    () => dispatch(closeFlyoutLeftPanel({ scope })),
    [dispatch, scope]
  );

  const closePreviewPanel = useCallback(
    () => dispatch(closeFlyoutPreviewPanel({ scope })),
    [dispatch, scope]
  );

  const previousPreviewPanel = useCallback(
    () => dispatch(previousFlyoutPreviewPanel({ scope })),
    [dispatch, scope]
  );

  const closePanels = useCallback(() => dispatch(closeFlyout({ scope })), [dispatch, scope]);

  useEffect(() => setPanels(layout), [layout]);

  const contextValue = useMemo(
    () => ({
      panels,
      scope,
      openPanels,
      openRightPanel,
      openLeftPanel,
      openPreviewPanel,
      closeRightPanel,
      closeLeftPanel,
      closePreviewPanel,
      closePanels,
      previousPreviewPanel,
      close,
    }),
    [
      panels,
      scope,
      openPanels,
      openRightPanel,
      openLeftPanel,
      openPreviewPanel,
      closeRightPanel,
      closeLeftPanel,
      closePreviewPanel,
      closePanels,
      previousPreviewPanel,
      close,
    ]
  );

  return (
    <ExpandableFlyoutContext.Provider value={contextValue}>
      {children}
    </ExpandableFlyoutContext.Provider>
  );
};

export const useExpandableFlyoutContext = () =>
  useContext<NonNullable<ExpandableFlyoutContext>>(ExpandableFlyoutContext);
