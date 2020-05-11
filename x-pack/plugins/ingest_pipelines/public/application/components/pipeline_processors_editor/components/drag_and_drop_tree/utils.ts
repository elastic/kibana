/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DraggableLocation, ProcessorSelector } from '../../types';
import { checkIfSamePath } from '../../utils';

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

export const resolveDestinationLocation = (
  items: ProcessorSelector[],
  destinationIndex: number,
  baseDestinationSelector: ProcessorSelector,
  dragDirection: DragDirection,
  sourceSelector: ProcessorSelector,
  isSourceAtRootLevel = false
): DraggableLocation => {
  // Dragged to top, place at root level
  if (destinationIndex <= 0) {
    const destinationSelector = items[destinationIndex] ?? baseDestinationSelector;
    return { selector: destinationSelector.slice(0, 1), index: 0 };
  }

  // Dragged to bottom, place at root level if source is already at root
  if (destinationIndex === items.length - 1 && isSourceAtRootLevel) {
    const destinationSelector = items[items.length - 1] ?? baseDestinationSelector;
    return { selector: destinationSelector.slice(0, 1), index: Infinity };
  }

  // This can happen when dragging across trees
  if (destinationIndex > items.length - 1) {
    return { selector: baseDestinationSelector.slice(0), index: destinationIndex };
  }

  const displacing: ProcessorSelector = items[destinationIndex];

  if (dragDirection === 'none') {
    return mapSelectorToDragLocation(displacing);
  }

  const below: ProcessorSelector = items[destinationIndex + 1];
  if (dragDirection === 'down' && below) {
    // Handle special case where we are actually want to reorder
    // an item in its own list instead of nesting inside of the previous
    // elements children.
    if (
      checkIfSamePath(sourceSelector.slice(0, -1), below.slice(0, -1)) &&
      displacing.length >= below.length
    ) {
      const location = mapSelectorToDragLocation(below);
      return {
        ...location,
        index: location.index - 1,
      };
    }
    // Handle special case where we do not want reordering an element
    // to the bottom of a nested list de-indents it
    if (
      checkIfSamePath(sourceSelector.slice(0, -1), displacing.slice(0, -1)) &&
      displacing.length >= below.length
    ) {
      return mapSelectorToDragLocation(displacing);
    }
    // Every other case for dragging down
    return mapSelectorToDragLocation(below);
  }

  // Just target displaced element when dragging up
  return mapSelectorToDragLocation(displacing);
};
