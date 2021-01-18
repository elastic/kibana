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

type ActiveDropTarget = {
  activeDropTarget?: DragDropIdentifier;
  dropTargetsByOrder: Record<string, { dropTarget: DragDropIdentifier } | undefined>;
};
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

  registerDropTarget: (order: number[], dropTarget?: DragDropIdentifier) => void;
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
  registerDropTarget: () => {},
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
    dropTargetsByOrder: Record<
      string,
      { dropTarget: DragDropIdentifier; canDrop?: (dragging: unknown) => boolean } | undefined
    >;
  };

  setActiveDropTarget: (newTarget?: DragDropIdentifier) => void;

  registerDropTarget: (
    order: number[],
    dropTarget?: DragDropIdentifier,
    canDrop?: (dragging: unknown) => boolean
  ) => void;

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
  const [draggingState, setDraggingState] = useState<{ dragging?: DragDropIdentifier }>({
    dragging: undefined,
  });
  const [keyboardModeState, setKeyboardModeState] = useState(false);
  const [activeDropTargetState, setActiveDropTargetState] = useState<{
    activeDropTarget?: DragDropIdentifier;
    dropTargetsByOrder: Record<
      string,
      { dropTarget: DragDropIdentifier; canDrop?: (dragging: unknown) => boolean } | undefined
    >;
  }>({
    activeDropTarget: undefined,
    dropTargetsByOrder: {},
  });

  const setDragging = useMemo(
    () => (dragging?: DragDropIdentifier) => setDraggingState({ dragging }),
    [setDraggingState]
  );

  const setActiveDropTarget = useMemo(
    () => (activeDropTarget?: DragDropIdentifier) =>
      setActiveDropTargetState((s) => ({ ...s, activeDropTarget })),
    [setActiveDropTargetState]
  );

  const registerDropTarget = useMemo(
    () => (
      order: number[],
      dropTarget?: DragDropIdentifier,
      canDrop?: (dragging: unknown) => boolean
    ) => {
      return setActiveDropTargetState((s) => {
        return {
          ...s,
          dropTargetsByOrder: {
            ...s.dropTargetsByOrder,
            [order.join(',')]: dropTarget ? { dropTarget, canDrop } : undefined,
          },
        };
      });
    },
    [setActiveDropTargetState]
  );

  return (
    <ChildDragDropProvider
      keyboardMode={keyboardModeState}
      setKeyboardMode={setKeyboardModeState}
      dragging={draggingState.dragging}
      setDragging={setDragging}
      activeDropTarget={activeDropTargetState}
      setActiveDropTarget={setActiveDropTarget}
      registerDropTarget={registerDropTarget}
    >
      {children}
    </ChildDragDropProvider>
  );
}

export function nextValidDropTarget(
  activeDropTarget: ActiveDropTarget,
  currentlyActiveDraggingElOrder: number[],
  filterElements: (el?: DragDropIdentifier) => void,
  reverse = false
) {
  const nextDropTargets = Object.entries(activeDropTarget.dropTargetsByOrder)
    .filter(([, target]) => !!target && filterElements(target?.dropTarget))
    .sort(([orderA], [orderB]) => {
      const parsedOrderA = orderA.split(',').map((v) => Number(v));
      const parsedOrderB = orderB.split(',').map((v) => Number(v));

      const relevantLevel = parsedOrderA.findIndex((v, i) => parsedOrderA[i] !== parsedOrderB[i]);
      return parsedOrderA[relevantLevel] - parsedOrderB[relevantLevel];
    });

  const currentActiveDropIndex = nextDropTargets.findIndex(([targetOrder, target]) => {
    return activeDropTarget.activeDropTarget
      ? target?.dropTarget === activeDropTarget.activeDropTarget
      : targetOrder === currentlyActiveDraggingElOrder.join(',');
  });

  const previousElement =
    (nextDropTargets.length + currentActiveDropIndex - 1) % nextDropTargets.length;
  const nextElement = (currentActiveDropIndex + 1) % nextDropTargets.length;
  return nextDropTargets[reverse ? previousElement : nextElement][1]?.dropTarget;
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
  registerDropTarget,
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
      registerDropTarget,
    }),
    [
      setDragging,
      dragging,
      activeDropTarget,
      setActiveDropTarget,
      registerDropTarget,
      setKeyboardMode,
      keyboardMode,
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
   * Ids of the elements that are translated up or down
   */
  itemsInGroup: DragDropIdentifier[];

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
   * aria-live message for changes in reordering
   */
  keyboardReorderMessage: string;
  /**
   * aria-live message to use once the current action is comitted
   */
  pendingActionSuccessMessage?: string;
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
    itemsInGroup: [],
    direction: '-',
    draggingHeight: 40,
    isReorderOn: false,
    keyboardReorderMessage: '',
    groupId: '',
  },
  setReorderState: () => () => {},
});

export function ReorderProvider({
  id,
  children,
  className,
  itemsInGroup,
}: {
  id: string;
  children: React.ReactNode;
  className?: string;
  itemsInGroup: DragDropIdentifier[];
}) {
  const [state, setState] = useState<ReorderContextState['reorderState']>({
    reorderedItems: [],
    itemsInGroup,
    direction: '-',
    draggingHeight: 40,
    isReorderOn: false,
    keyboardReorderMessage: '',
    groupId: id,
  });

  const setReorderState = useMemo(() => (dispatch: SetReorderStateDispatch) => setState(dispatch), [
    setState,
  ]);

  return (
    <div
      className={classNames(className, {
        'lnsDragDrop-isActiveGroup': state.isReorderOn && React.Children.count(children) > 1,
      })}
    >
      <ReorderContext.Provider value={{ reorderState: state, setReorderState }}>
        {children}
      </ReorderContext.Provider>
      <EuiPortal>
        <EuiScreenReaderOnly>
          <div>
            <p id="lnsDragDrop-reorderAnnouncement" aria-live="assertive" aria-atomic={true}>
              {state.keyboardReorderMessage}
            </p>
            <p id={`lnsDragDrop-reorderInstructions-${id}`}>
              {i18n.translate('xpack.lens.dragDrop.reorderInstructions', {
                defaultMessage: `Press space bar to start reordering the dimension group. When dragging, use arrow keys to reorder. Press space bar again to finish.`,
              })}
            </p>
            <p id={`lnsDragDrop-groupMovementInstructions-${id}`}>
              {i18n.translate('xpack.lens.dragDrop.groupMovementInstructions', {
                defaultMessage: `Use right arrow key to move dimension to next group.`,
              })}
            </p>
          </div>
        </EuiScreenReaderOnly>
      </EuiPortal>
    </div>
  );
}
