/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type cytoscape from 'cytoscape';

// layout options for alert/event graph
export const layout: cytoscape.LayoutOptions = {
  name: 'concentric',
  concentric(node) {
    return node.data('weight');
  },
  clockwise: true,
  equidistant: true,
  fit: true, // whether to fit the viewport to the graph
  minNodeSpacing: 10, // min spacing between outside of nodes (used for radius adjustment)
  nodeDimensionsIncludeLabels: true, // Excludes the label when calculating node bounding boxes for the layout algorithm
};
