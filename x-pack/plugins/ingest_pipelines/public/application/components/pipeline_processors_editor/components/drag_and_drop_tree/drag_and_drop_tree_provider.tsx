/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, {
  createContext,
  useState,
  FunctionComponent,
  useContext,
  useCallback,
  useRef,
} from 'react';
import { EuiDragDropContext } from '@elastic/eui';
import { determineDragDirection, resolveLocations } from './utils';
import { ProcessorSelector } from '../../types';

interface PrivateMapTreeEntry {
  selectors: ProcessorSelector[];
  baseSelector: ProcessorSelector;
}

type RegisterTreeItemsFunction = (id: string, entry: PrivateMapTreeEntry) => void;
type UnregisterTreeItemsFunction = (id: string) => void;

interface DragAndDropTreeContextValue {
  setCurrentDragSelector: (serializedSelector: string | undefined) => void;
  currentDragSelector?: string;
  registerTreeItems: RegisterTreeItemsFunction;
  unRegisterTreeItems: UnregisterTreeItemsFunction;
}

export interface OnDragEndArgs {
  source: ProcessorSelector;
  destination: ProcessorSelector;
}

/** This value comes from the {@link ProcessorInternal} type */
export const ON_FAILURE = 'onFailure';

const DragAndDropTreeContext = createContext<DragAndDropTreeContextValue>({} as any);

interface Props {
  onDragEnd: (arg: OnDragEndArgs) => void;
}

export const DragAndDropTreeProvider: FunctionComponent<Props> = ({ children, onDragEnd }) => {
  const dragDirectionRef = useRef<{
    start?: { index: number; treeId: string };
  }>({});
  const [currentDragSelector, setCurrentDragSelector] = useState<string | undefined>();
  const [privateTreeItemMap] = useState(() => new Map<string, PrivateMapTreeEntry>());

  const registerTreeItems = useCallback<RegisterTreeItemsFunction>(
    (id, items) => {
      privateTreeItemMap.set(id, items);
    },
    [privateTreeItemMap]
  );

  const unRegisterTreeItems = useCallback<UnregisterTreeItemsFunction>(
    id => {
      privateTreeItemMap.delete(id);
    },
    [privateTreeItemMap]
  );

  return (
    <DragAndDropTreeContext.Provider
      value={{
        currentDragSelector,
        setCurrentDragSelector,
        registerTreeItems,
        unRegisterTreeItems,
      }}
    >
      <EuiDragDropContext
        onBeforeCapture={({ draggableId: serializedSelector }) => {
          setCurrentDragSelector(serializedSelector);
        }}
        onDragStart={arg => {
          dragDirectionRef.current = {
            start: {
              index: arg.source.index,
              treeId: arg.source.droppableId,
            },
          };
        }}
        onDragUpdate={arg => {
          // We are dragging outside of the tree, clear tracking
          if (!arg.destination && !arg.combine) {
            dragDirectionRef.current = {};
            return;
          }

          // Reset "start" if we have gone x-tree
          if (
            arg.destination &&
            arg.source &&
            arg.destination.droppableId !== dragDirectionRef.current.start?.treeId
          ) {
            dragDirectionRef.current = {
              start: { index: arg.destination.index, treeId: arg.destination.droppableId },
            };
          }
        }}
        onDragEnd={arg => {
          setCurrentDragSelector(undefined);
          const { start } = dragDirectionRef.current;

          const { source, destination, combine } = arg;
          if (source && combine) {
            const sourceTree = privateTreeItemMap.get(source.droppableId)!;
            const destinationTree = privateTreeItemMap.get(combine.droppableId)!;
            const sourceSelector = sourceTree.selectors[source.index];
            // prettier-ignore
            const [/* tree id */, ...destinationSelector] = combine.draggableId.split('.');
            onDragEnd({
              source: sourceTree.baseSelector.concat(sourceSelector),
              destination: destinationTree.baseSelector
                .concat(destinationSelector)
                .concat(['onFailure', '0']),
            });
            return;
          }

          if (source && destination) {
            if (
              source.droppableId === destination.droppableId &&
              source.index === destination.index
            ) {
              return;
            }
            const dragDirection = determineDragDirection(destination.index, start?.index);
            const sourceTree = privateTreeItemMap.get(source.droppableId)!;
            const crossTreeDrag = source.droppableId !== destination.droppableId;
            const destinationTree = crossTreeDrag
              ? privateTreeItemMap.get(destination.droppableId)!
              : sourceTree;
            const sourceSelector = sourceTree.selectors[source.index];

            let destinationIndex = destination.index;
            if (crossTreeDrag && destination.index > 0) {
              if (dragDirection === 'down') {
                destinationIndex = destination.index - 1;
              }
            }

            const locations = resolveLocations({
              destinationItems: destinationTree.selectors,
              destinationIndex,
              baseDestinationSelector: destinationTree.baseSelector,
              dragDirection,
              sourceSelector,
              baseSourceSelector: sourceTree.baseSelector,
              isSourceAtRootLevel: sourceSelector.length <= 2,
            });

            onDragEnd(locations);
          }
        }}
      >
        {children}
      </EuiDragDropContext>
    </DragAndDropTreeContext.Provider>
  );
};

export const useDragDropContext = () => {
  const ctx = useContext(DragAndDropTreeContext);
  if (!ctx) {
    throw new Error('useDragDropContext can only be used inside of "DragAndDropTreeProvider"');
  }
  return ctx;
};
