/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DraggableLocation, ProcessorSelector } from '../../types';

export const mapSelectorToDragLocation = (selector: ProcessorSelector): DraggableLocation => {
  const stringIndex = selector[selector.length - 1];
  if (!stringIndex.match(/^[0-9]+$/)) {
    throw new Error(`Expected an integer but received "${stringIndex}"`);
  }
  return {
    selector: selector.slice(0, -1),
    index: parseInt(stringIndex, 10),
  };
};

export type DragDirection = 'up' | 'down' | 'none';

/**
 *
 * @param items
 * @param destinationIndex
 * @param baseDestinationSelector
 * @param dragDirection
 * @param isSourceAtRootLevel
 */
export const resolveDestinationLocation = (
  items: ProcessorSelector[],
  destinationIndex: number,
  baseDestinationSelector: ProcessorSelector,
  dragDirection: DragDirection,
  isSourceAtRootLevel = false
): DraggableLocation => {
  // Dragged to top, place at root level
  if (destinationIndex <= 0) {
    const destinationSelector = items[destinationIndex] ?? baseDestinationSelector;
    return { selector: destinationSelector.slice(0, 1), index: 0 };
  }

  // Dragged to bottom, place at root level if source is already at root
  if (destinationIndex === items.length - 1 && isSourceAtRootLevel) {
    const destinationSelector = items[destinationIndex] ?? baseDestinationSelector;
    return { selector: destinationSelector.slice(0, 1), index: items.length - 1 };
  }

  // This can happen when dragging across trees
  if (destinationIndex > items.length - 1) {
    return { selector: baseDestinationSelector.slice(0), index: destinationIndex };
  }

  const displacing: ProcessorSelector = items[destinationIndex];

  if (dragDirection === 'none') {
    return mapSelectorToDragLocation(displacing);
  }

  if (dragDirection === 'down') {
    const below: ProcessorSelector = items[destinationIndex + 1];
    return mapSelectorToDragLocation(below ?? displacing);
  } else {
    return mapSelectorToDragLocation(displacing);
  }
};
