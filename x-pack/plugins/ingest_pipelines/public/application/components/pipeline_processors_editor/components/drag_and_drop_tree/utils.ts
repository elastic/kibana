/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { ProcessorSelector } from '../../types';
import { checkIfSamePath } from '../../utils';
import { DragAndDropSpecialLocations } from '../../constants';

export type DragDirection = 'up' | 'down' | 'none';

export const determineDragDirection = (
  currentIndex?: number,
  startIndex?: number
): DragDirection => {
  let dragDirection: DragDirection;
  if (currentIndex == null || startIndex == null) {
    dragDirection = 'none';
  } else if (currentIndex === startIndex) {
    dragDirection = 'none';
  } else if (currentIndex < startIndex) {
    dragDirection = 'up';
  } else {
    dragDirection = 'down';
  }
  return dragDirection;
};

interface ResolveDestinationArgs {
  destinationItems: ProcessorSelector[];
  destinationIndex: number;
  baseDestinationSelector: ProcessorSelector;
  baseSourceSelector: ProcessorSelector;
  dragDirection: DragDirection;
  sourceSelector: ProcessorSelector;
  isSourceAtRootLevel?: boolean;
}

interface ResolveDestinationResult {
  destination: ProcessorSelector;
  source: ProcessorSelector;
}

export const resolveLocations = ({
  destinationItems,
  destinationIndex,
  baseDestinationSelector,
  dragDirection,
  baseSourceSelector,
  sourceSelector,
  isSourceAtRootLevel = false,
}: ResolveDestinationArgs): ResolveDestinationResult => {
  const addBasePathPrefix = (destinationSelector: ProcessorSelector): ResolveDestinationResult => {
    return {
      destination: baseDestinationSelector.concat(destinationSelector),
      source: baseSourceSelector.concat(sourceSelector),
    };
  };

  // Dragged to top, place at root level
  if (destinationIndex <= 0 && dragDirection !== 'down') {
    return addBasePathPrefix(['0']);
  }

  // Dragged to bottom, place at root level if source is already at root
  if (destinationIndex === destinationItems.length - 1 && isSourceAtRootLevel) {
    return addBasePathPrefix([DragAndDropSpecialLocations.bottom]);
  }

  // This can happen when dragging across trees
  if (destinationIndex > destinationItems.length - 1) {
    return addBasePathPrefix([String(destinationIndex)]);
  }

  const displacing: ProcessorSelector = destinationItems[destinationIndex];

  if (dragDirection === 'none') {
    return addBasePathPrefix(displacing);
  }

  const below: ProcessorSelector = destinationItems[destinationIndex + 1];
  if (dragDirection === 'down' && below) {
    const displacingSameAsBelow = checkIfSamePath(displacing.slice(0, -1), below.slice(0, -1));

    if (displacingSameAsBelow) {
      return addBasePathPrefix(below);
    }
    // Handle special case where we are actually reordering
    // an item in its own list instead of nesting. This is "dragging past" a nested
    // element.
    const sourceSameAsBelowPath = checkIfSamePath(sourceSelector.slice(0, -1), below.slice(0, -1));
    if (sourceSameAsBelowPath && displacing.length > below.length) {
      return addBasePathPrefix(below);
    }

    const sourceSameAsDisplacingPath = checkIfSamePath(
      sourceSelector.slice(0, -1),
      displacing.slice(0, -1)
    );
    // Handle special case where we do not want reordering an element
    // to the bottom of a nested list de-indents it
    if (sourceSameAsDisplacingPath && displacing.length > below.length) {
      return addBasePathPrefix(displacing);
    }
    // Every other case for dragging down
    return addBasePathPrefix(below);
  }

  // Just target displaced element when dragging up
  return addBasePathPrefix(displacing);
};
