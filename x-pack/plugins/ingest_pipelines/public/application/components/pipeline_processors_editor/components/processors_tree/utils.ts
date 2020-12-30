/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ProcessorInternal } from '../../types';

// These values are tied to the style and heights following components:
// Do not change these numbers without testing the component for visual
// regressions!
// - ./components/tree_node.tsx
// - ./components/drop_zone_button.tsx
// - ./components/pipeline_processors_editor_item.tsx
const itemHeightsPx = {
  WITHOUT_NESTED_ITEMS: 57,
  WITH_NESTED_ITEMS: 137,
  TOP_PADDING: 6,
};

export const calculateItemHeight = ({
  processor,
  isFirstInArray,
}: {
  processor: ProcessorInternal;
  isFirstInArray: boolean;
}): number => {
  const padding = isFirstInArray ? itemHeightsPx.TOP_PADDING : 0;

  if (!processor.onFailure?.length) {
    return padding + itemHeightsPx.WITHOUT_NESTED_ITEMS;
  }

  return (
    padding +
    itemHeightsPx.WITH_NESTED_ITEMS +
    processor.onFailure.reduce((acc, p, idx) => {
      return acc + calculateItemHeight({ processor: p, isFirstInArray: idx === 0 });
    }, 0)
  );
};
