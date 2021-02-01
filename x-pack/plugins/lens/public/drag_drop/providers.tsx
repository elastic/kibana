/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useMemo } from 'react';
import classNames from 'classnames';
import { EuiScreenReaderOnly, EuiPortal } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { HumanData } from './announcements';

export type DragDropIdentifier = Record<string, unknown> & {
  id: string;
  /**
   * The data for accessibility, consists of required label and not required groupLabel and position in group
   */
  humanData: HumanData;
};

export interface ActiveDropTarget {
  activeDropTarget?: DragDropIdentifier;
  dropTargetsByOrder: Record<
    string,
    { dropTarget: DragDropIdentifier; onDrop?: (dropped: DragDropIdentifier) => void } | undefined
  >;
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
  registerDropTarget: (
    order: number[],
    dropTarget: DragDropIdentifier | undefined,
    onDrop?: (drop: DragDropIdentifier) => void
  ) => void;
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
      | { dropTarget: DragDropIdentifier; onDrop?: (dragging: DragDropIdentifier) => void }
      | undefined
    >;
  };

  setActiveDropTarget: (newTarget?: DragDropIdentifier) => void;

  registerDropTarget: (
    order: number[],
    dropTarget?: DragDropIdentifier,
    onDrop?: (dragging: DragDropIdentifier) => void
  ) => void;

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
    dropTargetsByOrder: Record<
      string,
      | { dropTarget: DragDropIdentifier; onDrop?: (dragging: DragDropIdentifier) => void }
      | undefined
    >;
  }>({
    activeDropTarget: undefined,
    dropTargetsByOrder: {},
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

  const registerDropTarget = useMemo(
    () => (
      order: number[],
      dropTarget?: DragDropIdentifier,
      onDrop?: (dragging: DragDropIdentifier) => void
    ) => {
      return setActiveDropTargetState((s) => {
        return {
          ...s,
          dropTargetsByOrder: {
            ...s.dropTargetsByOrder,
            [order.join(',')]: dropTarget ? { dropTarget, onDrop } : undefined,
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

export function nextValidDropTarget(
  activeDropTarget: ActiveDropTarget | undefined,
  draggingData: [string, { dropTarget: DragDropIdentifier }],
  filterElements?: (el?: DragDropIdentifier) => boolean,
  reverse = false
) {
  if (!activeDropTarget) {
    return;
  }
  const nextDropTargets = [...Object.entries(activeDropTarget.dropTargetsByOrder), draggingData]
    .filter(
      ([, target]) => !!target && !!(filterElements ? filterElements(target?.dropTarget) : true)
    )
    .sort(([orderA], [orderB]) => {
      const parsedOrderA = orderA.split(',').map((v) => Number(v));
      const parsedOrderB = orderB.split(',').map((v) => Number(v));

      const relevantLevel = parsedOrderA.findIndex((v, i) => parsedOrderA[i] !== parsedOrderB[i]);
      return parsedOrderA[relevantLevel] - parsedOrderB[relevantLevel];
    });
  const currentActiveDropIndex = nextDropTargets.findIndex(([targetOrder, target]) => {
    return activeDropTarget.activeDropTarget
      ? target?.dropTarget.id === activeDropTarget.activeDropTarget.id
      : targetOrder === draggingData[0];
  });

  const previousElement =
    (nextDropTargets.length + currentActiveDropIndex - 1) % nextDropTargets.length;
  const nextElement = (currentActiveDropIndex + 1) % nextDropTargets.length;
  return nextDropTargets[reverse ? previousElement : nextElement][1]?.dropTarget;
}

export function getTargetOnDrop(activeDropTarget?: ActiveDropTarget) {
  if (!activeDropTarget?.dropTargetsByOrder || !activeDropTarget?.activeDropTarget) {
    return;
  }
  const targetEl = Object.entries(activeDropTarget.dropTargetsByOrder).find(([, target]) => {
    return target?.dropTarget.id === activeDropTarget?.activeDropTarget?.id;
  });

  return targetEl?.[1]?.onDrop;
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
