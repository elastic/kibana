/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { createContext, useState, FunctionComponent, useContext, useCallback } from 'react';
import { EuiDragDropContext } from '@elastic/eui';
import { mapSelectorToDragLocation, resolveDestinationLocation } from './utils';
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
        onDragEnd={arg => {
          setCurrentDragSelector(undefined);

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
            const sourceTree = privateTreeItemMap.get(source.droppableId)!;
            const destinationTree =
              source.droppableId !== destination.droppableId
                ? privateTreeItemMap.get(destination.droppableId)!
                : sourceTree;
            const sourceSelector = sourceTree.selectors[source.index];
            onDragEnd({
              source: mapSelectorToDragLocation(sourceSelector),
              destination: resolveDestinationLocation(
                destinationTree.selectors,
                destination.index,
                destinationTree.baseSelector
              ),
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
