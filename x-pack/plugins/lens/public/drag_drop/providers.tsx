/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useMemo } from 'react';
import classNames from 'classnames';
import { EuiScreenReaderOnly, EuiPortal } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export type DragDropIdentifier = Record<string, unknown> & {
  id: string;
};

export interface ActiveDropTarget {
  activeDropTarget?: DragDropIdentifier;
}
/**
 * The shape of the drag / drop context.
 */
export interface DragContextState {
  /**
   * The item being dragged or undefined.
   */
  dragging?: DragDropIdentifier;

  /**
   * keyboard mode
   */
  keyboardMode: boolean;
  /**
   * keyboard mode
   */
  setKeyboardMode: (mode: boolean) => void;
  /**
   * Set the item being dragged.
   */
  setDragging: (dragging?: DragDropIdentifier) => void;

  activeDropTarget?: ActiveDropTarget;

  setActiveDropTarget: (newTarget?: DragDropIdentifier) => void;

  setA11yMessage: (message: string) => void;
}

/**
 * The drag / drop context singleton, used like so:
 *
 * const { dragging, setDragging } = useContext(DragContext);
 */
export const DragContext = React.createContext<DragContextState>({
  dragging: undefined,
  setDragging: () => {},
  keyboardMode: false,
  setKeyboardMode: () => {},
  activeDropTarget: undefined,
  setActiveDropTarget: () => {},
  setA11yMessage: () => {},
});

/**
 * The argument to DragDropProvider.
 */
export interface ProviderProps {
  /**
   * keyboard mode
   */
  keyboardMode: boolean;
  /**
   * keyboard mode
   */
  setKeyboardMode: (mode: boolean) => void;
  /**
   * Set the item being dragged.
   */
  /**
   * The item being dragged. If unspecified, the provider will
   * behave as if it is the root provider.
   */
  dragging?: DragDropIdentifier;

  /**
   * Sets the item being dragged. If unspecified, the provider
   * will behave as if it is the root provider.
   */
  setDragging: (dragging?: DragDropIdentifier) => void;

  activeDropTarget?: {
    activeDropTarget?: DragDropIdentifier;
  };

  setActiveDropTarget: (newTarget?: DragDropIdentifier) => void;

  /**
   * The React children.
   */
  children: React.ReactNode;

  setA11yMessage: (message: string) => void;
}

/**
 * A React provider that tracks the dragging state. This should
 * be placed at the root of any React application that supports
 * drag / drop.
 *
 * @param props
 */
export function RootDragDropProvider({ children }: { children: React.ReactNode }) {
  const [draggingState, setDraggingState] = useState<{ dragging?: DragDropIdentifier }>({
    dragging: undefined,
  });
  const [keyboardModeState, setKeyboardModeState] = useState(false);
  const [a11yMessageState, setA11yMessageState] = useState('');
  const [activeDropTargetState, setActiveDropTargetState] = useState<{
    activeDropTarget?: DragDropIdentifier;
  }>({
    activeDropTarget: undefined,
  });

  const setDragging = useMemo(
    () => (dragging?: DragDropIdentifier) => setDraggingState({ dragging }),
    [setDraggingState]
  );

  const setA11yMessage = useMemo(() => (message: string) => setA11yMessageState(message), [
    setA11yMessageState,
  ]);

  const setActiveDropTarget = useMemo(
    () => (activeDropTarget?: DragDropIdentifier) =>
      setActiveDropTargetState((s) => ({ ...s, activeDropTarget })),
    [setActiveDropTargetState]
  );

  return (
    <div>
      <ChildDragDropProvider
        keyboardMode={keyboardModeState}
        setKeyboardMode={setKeyboardModeState}
        dragging={draggingState.dragging}
        setA11yMessage={setA11yMessage}
        setDragging={setDragging}
        activeDropTarget={activeDropTargetState}
        setActiveDropTarget={setActiveDropTarget}
      >
        {children}
      </ChildDragDropProvider>
      <EuiPortal>
        <EuiScreenReaderOnly>
          <div>
            <p aria-live="assertive" aria-atomic={true}>
              {a11yMessageState}
            </p>
            <p id={`lnsDragDrop-keyboardInstructions`}>
              {i18n.translate('xpack.lens.dragDrop.keyboardInstructions', {
                defaultMessage: `Press enter or space to start reordering the dimension group. When dragging, use arrow keys to reorder. Press enter or space again to finish.`,
              })}
            </p>
          </div>
        </EuiScreenReaderOnly>
      </EuiPortal>
    </div>
  );
}

/**
 * A React drag / drop provider that derives its state from a RootDragDropProvider. If
 * part of a React application is rendered separately from the root, this provider can
 * be used to enable drag / drop functionality within the disconnected part.
 *
 * @param props
 */
export function ChildDragDropProvider({
  dragging,
  setDragging,
  setKeyboardMode,
  keyboardMode,
  activeDropTarget,
  setActiveDropTarget,
  setA11yMessage,
  children,
}: ProviderProps) {
  const value = useMemo(
    () => ({
      setKeyboardMode,
      keyboardMode,
      dragging,
      setDragging,
      activeDropTarget,
      setActiveDropTarget,
      setA11yMessage,
    }),
    [
      setDragging,
      dragging,
      activeDropTarget,
      setActiveDropTarget,
      setKeyboardMode,
      keyboardMode,
      setA11yMessage,
    ]
  );
  return <DragContext.Provider value={value}>{children}</DragContext.Provider>;
}

export interface ReorderState {
  /**
   * Ids of the elements that are translated up or down
   */
  reorderedItems: DragDropIdentifier[];

  /**
   * Direction of the move of dragged element in the reordered list
   */
  direction: '-' | '+';
  /**
   * height of the dragged element
   */
  draggingHeight: number;
  /**
   * indicates that user is in keyboard mode
   */
  isReorderOn: boolean;
  /**
   * reorder group needed for screen reader aria-described-by attribute
   */
  groupId: string;
}

type SetReorderStateDispatch = (prevState: ReorderState) => ReorderState;

export interface ReorderContextState {
  reorderState: ReorderState;
  setReorderState: (dispatch: SetReorderStateDispatch) => void;
}

export const ReorderContext = React.createContext<ReorderContextState>({
  reorderState: {
    reorderedItems: [],
    direction: '-',
    draggingHeight: 40,
    isReorderOn: false,
    groupId: '',
  },
  setReorderState: () => () => {},
});

export function ReorderProvider({
  id,
  children,
  className,
}: {
  id: string;
  children: React.ReactNode;
  className?: string;
}) {
  const [state, setState] = useState<ReorderContextState['reorderState']>({
    reorderedItems: [],
    direction: '-',
    draggingHeight: 40,
    isReorderOn: false,
    groupId: id,
  });

  const setReorderState = useMemo(() => (dispatch: SetReorderStateDispatch) => setState(dispatch), [
    setState,
  ]);
  return (
    <div
      data-test-subj="lnsDragDrop-reorderableGroup"
      className={classNames(className, {
        'lnsDragDrop-isActiveGroup': state.isReorderOn && React.Children.count(children) > 1,
      })}
    >
      <ReorderContext.Provider value={{ reorderState: state, setReorderState }}>
        {children}
      </ReorderContext.Provider>
    </div>
  );
}

export const reorderAnnouncements = {
  moved: (itemLabel: string, position: number, prevPosition: number) => {
    return prevPosition === position
      ? i18n.translate('xpack.lens.dragDrop.elementMovedBack', {
          defaultMessage: `You have moved back the item {itemLabel} to position {prevPosition}`,
          values: {
            itemLabel,
            prevPosition,
          },
        })
      : i18n.translate('xpack.lens.dragDrop.elementMoved', {
          defaultMessage: `You have moved the item {itemLabel} from position {prevPosition} to position {position}`,
          values: {
            itemLabel,
            position,
            prevPosition,
          },
        });
  },

  lifted: (itemLabel: string, position: number) =>
    i18n.translate('xpack.lens.dragDrop.elementLifted', {
      defaultMessage: `You have lifted an item {itemLabel} in position {position}`,
      values: {
        itemLabel,
        position,
      },
    }),

  cancelled: (position: number) =>
    i18n.translate('xpack.lens.dragDrop.abortMessageReorder', {
      defaultMessage:
        'Movement cancelled. The item has returned to its starting position {position}',
      values: {
        position,
      },
    }),
  dropped: (position: number, prevPosition: number) =>
    i18n.translate('xpack.lens.dragDrop.dropMessageReorder', {
      defaultMessage:
        'You have dropped the item. You have moved the item from position {prevPosition} to positon {position}',
      values: {
        position,
        prevPosition,
      },
    }),
};
