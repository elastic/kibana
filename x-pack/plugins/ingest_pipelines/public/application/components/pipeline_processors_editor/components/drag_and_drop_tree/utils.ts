/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DraggableLocation, ProcessorSelector } from '../../types';

export const resolveDestinationLocation = (
  items: ProcessorSelector[],
  isRootLevelSource: boolean,
  destinationIndex: number
): DraggableLocation => {
  // TODO: This needs to be vastly improved.
  const destinationSelector = items[destinationIndex];
  const destinationProcessorsSelector = destinationSelector.slice(0, -1);

  if (destinationIndex === 0) {
    return { selector: [], index: 0 };
  }

  if (destinationIndex === items.length - 1 && isRootLevelSource) {
    return { selector: [], index: items.length - 1 };
  }

  return {
    selector: destinationProcessorsSelector,
    index: parseInt(destinationSelector[destinationSelector.length - 1], 10),
  };
};
