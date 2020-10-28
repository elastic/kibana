/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useMemo, useRef, MutableRefObject } from 'react';
import { EuiScreenReaderOnly } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export type Dragging =
  | (Record<string, unknown> & {
      id: string;
    })
  | undefined;

/**
 * The shape of the drag / drop context.
 */
export interface DragContextState {
  /**
   * The item being dragged or undefined.
   */
  dragging: Dragging;

  /**
   * Set the item being dragged.
   */
  setDragging: (dragging: Dragging) => void;
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
  dragging: Dragging;

  /**
   * Sets the item being dragged. If unspecified, the provider
   * will behave as if it is the root provider.
   */
  setDragging: (dragging: Dragging) => void;

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
  const [state, setState] = useState<{ dragging: Dragging }>({
    dragging: undefined,
  });
  const setDragging = useMemo(() => (dragging: Dragging) => setState({ dragging }), [setState]);

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

interface ReorderState {
  /**
   * Ids of the elements that are translated up or down
   */
  reorderedItems: string[];

  /**
   * Class responsible for transform (translation)
   */
  className: 'lnsDragDrop-isReorderable--down' | 'lnsDragDrop-isReorderable--up';
  /**
   * indicates that user is in keyboard mode
   */
  isKeyboardReorderOn: boolean;
  /**
   * aria-live message for changes in reordering
   */
  keyboardReorderMessage: string;
  draggedElementOriginalPosition?: DOMRect;
}

export interface ReorderContextState {
  reorderState: ReorderState;
  currentElementPosition: React.MutableRefObject<number | null>;
  setReorderState: (reorderState: ReorderState) => void;
}

export const ReorderContext = React.createContext<ReorderContextState>({
  reorderState: {
    reorderedItems: [],
    className: 'lnsDragDrop-isReorderable--down',
    isKeyboardReorderOn: false,
    keyboardReorderMessage: '',
  },
  currentElementPosition: React.createRef(),
  setReorderState: () => {},
});

export function ReorderProvider({ children }: { children: React.ReactNode }) {
  const currentElementPosition: MutableRefObject<number | null> = useRef(null);
  const [state, setState] = useState<ReorderContextState['reorderState']>({
    isKeyboardReorderOn: false,
    reorderedItems: [],
    className: 'lnsDragDrop-isReorderable--down',
    keyboardReorderMessage: '',
  });
  const setReorderState = useMemo(() => (reorderState: ReorderState) => setState(reorderState), [
    setState,
  ]);

  return (
    <div
      onDragOver={() => {
        const overlapsWithOriginalPosition =
          state.draggedElementOriginalPosition &&
          currentElementPosition.current &&
          currentElementPosition.current > state.draggedElementOriginalPosition.y &&
          currentElementPosition.current <
            state.draggedElementOriginalPosition.y + state.draggedElementOriginalPosition.height;
        if (overlapsWithOriginalPosition) {
          setReorderState({
            ...state,
            reorderedItems: [],
          });
        }
      }}
    >
      <ReorderContext.Provider
        value={{ reorderState: state, setReorderState, currentElementPosition }}
      >
        {children}
      </ReorderContext.Provider>
      <EuiScreenReaderOnly>
        <p aria-live="assertive">{state.keyboardReorderMessage}</p>
      </EuiScreenReaderOnly>
      <EuiScreenReaderOnly>
        <p id="lnsDragDrop-reorderInstructions">
          {i18n.translate('xpack.lens.dragDrop.reorderInstructions', {
            defaultMessage: `Press space bar to start a drag. When dragging, use arrow keys to reorder. Press space bar again to finish.`,
          })}
        </p>
      </EuiScreenReaderOnly>
    </div>
  );
}
