/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useMemo } from 'react';
import classNames from 'classnames';
import { EuiScreenReaderOnly, EuiPortal } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { HumanData } from './announcements';
import { DropType } from '../types';

/**
 * A function that handles a drop event.
 */
export type DropHandler = (dropped: DragDropIdentifier, dropType?: DropType) => void;

export type DragDropIdentifier = Record<string, unknown> & {
  id: string;
  /**
   * The data for accessibility, consists of required label and not required groupLabel and position in group
   */
  humanData: HumanData;
};

export type DraggingIdentifier = DragDropIdentifier & {
  ghost?: {
    children: React.ReactElement;
    style: React.CSSProperties;
  };
};

export type DropIdentifier = DragDropIdentifier & {
  dropType: DropType;
  onDrop: DropHandler;
};

export interface DropTargets {
  activeDropTarget?: DropIdentifier;
  dropTargetsByOrder: Record<string, DropIdentifier | undefined>;
}
/**
 * The shape of the drag / drop context.
 */
export interface DragContextState {
  /**
   * The item being dragged or undefined.
   */
  dragging?: DraggingIdentifier;

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
  setDragging: (dragging?: DraggingIdentifier) => void;

  activeDropTarget?: DropTargets;

  setActiveDropTarget: (newTarget?: DropIdentifier) => void;

  setA11yMessage: (message: string) => void;
  registerDropTarget: (order: number[], dropTarget?: DropIdentifier) => void;
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
  dragging?: DraggingIdentifier;

  /**
   * Sets the item being dragged. If unspecified, the provider
   * will behave as if it is the root provider.
   */
  setDragging: (dragging?: DraggingIdentifier) => void;

  activeDropTarget?: {
    activeDropTarget?: DropIdentifier;
    dropTargetsByOrder: Record<string, DropIdentifier | undefined>;
  };

  setActiveDropTarget: (newTarget?: DropIdentifier) => void;

  registerDropTarget: (order: number[], dropTarget?: DropIdentifier) => void;

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
  const [draggingState, setDraggingState] = useState<{ dragging?: DraggingIdentifier }>({
    dragging: undefined,
  });
  const [keyboardModeState, setKeyboardModeState] = useState(false);
  const [a11yMessageState, setA11yMessageState] = useState('');
  const [activeDropTargetState, setActiveDropTargetState] = useState<{
    activeDropTarget?: DropIdentifier;
    dropTargetsByOrder: Record<string, DropIdentifier | undefined>;
  }>({
    activeDropTarget: undefined,
    dropTargetsByOrder: {},
  });

  const setDragging = useMemo(
    () => (dragging?: DraggingIdentifier) => setDraggingState({ dragging }),
    [setDraggingState]
  );

  const setA11yMessage = useMemo(() => (message: string) => setA11yMessageState(message), [
    setA11yMessageState,
  ]);

  const setActiveDropTarget = useMemo(
    () => (activeDropTarget?: DropIdentifier) =>
      setActiveDropTargetState((s) => ({ ...s, activeDropTarget })),
    [setActiveDropTargetState]
  );

  const registerDropTarget = useMemo(
    () => (order: number[], dropTarget?: DropIdentifier) => {
      return setActiveDropTargetState((s) => {
        return {
          ...s,
          dropTargetsByOrder: {
            ...s.dropTargetsByOrder,
            [order.join(',')]: dropTarget,
          },
        };
      });
    },
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
        registerDropTarget={registerDropTarget}
      >
        {children}
      </ChildDragDropProvider>
      <EuiPortal>
        <EuiScreenReaderOnly>
          <div>
            <p aria-live="assertive" aria-atomic={true}>
              {a11yMessageState}
            </p>
            <p id={`lnsDragDrop-keyboardInstructionsWithReorder`}>
              {i18n.translate('xpack.lens.dragDrop.keyboardInstructionsReorder', {
                defaultMessage: `Press space or enter to start dragging. When dragging, use the up/down arrow keys to reorder items in the group and left/right arrow keys to choose drop targets outside of the group. Press space or enter again to finish.`,
              })}
            </p>
            <p id={`lnsDragDrop-keyboardInstructions`}>
              {i18n.translate('xpack.lens.dragDrop.keyboardInstructions', {
                defaultMessage: `Press space or enter to start dragging. When dragging, use the left/right arrow keys to move between drop targets. Press space or enter again to finish.`,
              })}
            </p>
          </div>
        </EuiScreenReaderOnly>
      </EuiPortal>
    </div>
  );
}

export function nextValidDropTarget(
  activeDropTarget: DropTargets | undefined,
  draggingOrder: [string],
  filterElements: (el: DragDropIdentifier) => boolean = () => true,
  reverse = false
) {
  if (!activeDropTarget) {
    return;
  }

  const filteredTargets = [...Object.entries(activeDropTarget.dropTargetsByOrder)].filter(
    ([, dropTarget]) => dropTarget && filterElements(dropTarget)
  );

  const nextDropTargets = [...filteredTargets, draggingOrder].sort(([orderA], [orderB]) => {
    const parsedOrderA = orderA.split(',').map((v) => Number(v));
    const parsedOrderB = orderB.split(',').map((v) => Number(v));

    const relevantLevel = parsedOrderA.findIndex((v, i) => parsedOrderA[i] !== parsedOrderB[i]);
    return parsedOrderA[relevantLevel] - parsedOrderB[relevantLevel];
  });

  let currentActiveDropIndex = nextDropTargets.findIndex(
    ([_, dropTarget]) => dropTarget?.id === activeDropTarget?.activeDropTarget?.id
  );

  if (currentActiveDropIndex === -1) {
    currentActiveDropIndex = nextDropTargets.findIndex(
      ([targetOrder]) => targetOrder === draggingOrder[0]
    );
  }

  const previousElement =
    (nextDropTargets.length + currentActiveDropIndex - 1) % nextDropTargets.length;
  const nextElement = (currentActiveDropIndex + 1) % nextDropTargets.length;

  return nextDropTargets[reverse ? previousElement : nextElement][1];
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
      setA11yMessage,
      registerDropTarget,
    }),
    [
      setDragging,
      dragging,
      activeDropTarget,
      setActiveDropTarget,
      setKeyboardMode,
      keyboardMode,
      setA11yMessage,
      registerDropTarget,
    ]
  );
  return <DragContext.Provider value={value}>{children}</DragContext.Provider>;
}

export interface ReorderState {
  /**
   * Ids of the elements that are translated up or down
   */
  reorderedItems: Array<{ id: string; height?: number }>;

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
