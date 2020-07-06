/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useMemo } from 'react';

/**
 * The shape of the drag / drop context.
 */
export interface DragContextState {
  /**
   * The item being dragged or undefined.
   */
  dragging: unknown;

  /**
   * Set the item being dragged.
   */
  setDragging: (dragging: unknown) => void;
}

/**
 * The drag / drop context singleton, used like so:
 *
 * const { dragging, setDragging } = useContext(DragContext);
 */
export const DragContext = React.createContext<DragContextState>({
  dragging: undefined,
  setDragging: () => {},
});

/**
 * The argument to DragDropProvider.
 */
export interface ProviderProps {
  /**
   * The item being dragged. If unspecified, the provider will
   * behave as if it is the root provider.
   */
  dragging: unknown;

  /**
   * Sets the item being dragged. If unspecified, the provider
   * will behave as if it is the root provider.
   */
  setDragging: (dragging: unknown) => void;

  /**
   * The React children.
   */
  children: React.ReactNode;
}

/**
 * A React provider that tracks the dragging state. This should
 * be placed at the root of any React application that supports
 * drag / drop.
 *
 * @param props
 */
export function RootDragDropProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<{ dragging: unknown }>({
    dragging: undefined,
  });
  const setDragging = useMemo(() => (dragging: unknown) => setState({ dragging }), [setState]);

  return (
    <ChildDragDropProvider dragging={state.dragging} setDragging={setDragging}>
      {children}
    </ChildDragDropProvider>
  );
}

/**
 * A React drag / drop provider that derives its state from a RootDragDropProvider. If
 * part of a React application is rendered separately from the root, this provider can
 * be used to enable drag / drop functionality within the disconnected part.
 *
 * @param props
 */
export function ChildDragDropProvider({ dragging, setDragging, children }: ProviderProps) {
  const value = useMemo(() => ({ dragging, setDragging }), [setDragging, dragging]);
  return <DragContext.Provider value={value}>{children}</DragContext.Provider>;
}
