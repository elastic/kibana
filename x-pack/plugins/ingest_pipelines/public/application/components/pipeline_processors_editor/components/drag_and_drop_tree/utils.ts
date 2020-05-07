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

export const resolveDestinationLocation = (
  items: ProcessorSelector[],
  destinationIndex: number,
  baseSelector: ProcessorSelector
): DraggableLocation => {
  // Dragged to top, place at root level
  if (destinationIndex === 0) {
    const destinationSelector = items[destinationIndex] ?? baseSelector;
    return { selector: destinationSelector.slice(0, 1), index: 0 };
  }

  // Dragged to bottom, place at root level
  if (destinationIndex === items.length - 1 || destinationIndex === items.length) {
    const destinationSelector = items[destinationIndex] ?? baseSelector;
    return { selector: destinationSelector.slice(0, 1), index: items.length - 1 };
  }

  const above: ProcessorSelector = items[destinationIndex - 1];
  const below: ProcessorSelector = items[destinationIndex]; // This is the processor we are displacing

  if (above.length !== below.length) {
    return mapSelectorToDragLocation(below);
  }

  return mapSelectorToDragLocation(items[destinationIndex]);
};
