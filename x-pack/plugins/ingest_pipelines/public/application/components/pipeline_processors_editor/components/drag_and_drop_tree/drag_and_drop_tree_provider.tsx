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
import { DragDirection, mapSelectorToDragLocation, resolveDestinationLocation } from './utils';
import { DraggableLocation, ProcessorSelector } from '../../types';

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
  source: DraggableLocation;
  destination: DraggableLocation;
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
    current?: { index: number; treeId: string };
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
            current: {
              index: arg.source.index,
              treeId: arg.source.droppableId,
            },
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

          if (
            arg.destination &&
            arg.source &&
            (arg.destination.index !== dragDirectionRef.current.current?.index ||
              arg.destination.droppableId !== dragDirectionRef.current.current?.treeId)
          ) {
            dragDirectionRef.current = {
              current: { index: arg.destination.index, treeId: arg.destination.droppableId },
              start:
                // Reset start if we have gone x-tree
                arg.destination.droppableId !== dragDirectionRef.current.current?.treeId
                  ? { index: arg.destination.index, treeId: arg.destination.droppableId }
                  : dragDirectionRef.current.start,
            };
          }
        }}
        onDragEnd={arg => {
          setCurrentDragSelector(undefined);
          const dragPointers = dragDirectionRef.current;
          dragDirectionRef.current = {};

          const { source, destination, combine } = arg;
          if (source && combine) {
            const sourceTree = privateTreeItemMap.get(source.droppableId)!;
            const sourceSelector = sourceTree.selectors[source.index];
            const destinationSelector = combine.draggableId.split('.');
            onDragEnd({
              source: {
                index: parseInt(sourceSelector[sourceSelector.length - 1], 10),
                selector: sourceSelector.slice(0, -1),
              },
              destination: {
                index: parseInt(destinationSelector[destinationSelector.length - 1], 10),
                selector: destinationSelector.concat(ON_FAILURE),
              },
            });
            return;
          }

          if (source && destination) {
            let dragDirection: DragDirection;
            const { current, start } = dragPointers;
            if (!current || !start) {
              dragDirection = 'none';
            } else if (current.index < start.index) {
              dragDirection = 'up';
            } else {
              dragDirection = 'down';
            }

            const sourceTree = privateTreeItemMap.get(source.droppableId)!;
            const xTreeDrag = source.droppableId !== destination.droppableId;
            const destinationTree = xTreeDrag
              ? privateTreeItemMap.get(destination.droppableId)!
              : sourceTree;
            const sourceSelector = sourceTree.selectors[source.index];

            const destinationLocation = resolveDestinationLocation(
              destinationTree.selectors,
              destination.index,
              destinationTree.baseSelector,
              xTreeDrag ? 'none' : dragDirection,
              sourceSelector.length <= 2
            );

            onDragEnd({
              source: mapSelectorToDragLocation(sourceSelector),
              destination: destinationLocation,
            });
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
