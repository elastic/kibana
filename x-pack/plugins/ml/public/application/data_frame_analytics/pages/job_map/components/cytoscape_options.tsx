/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import cytoscape from 'cytoscape';
import theme from '@elastic/eui/dist/eui_theme_light.json';
import { JOB_MAP_NODE_TYPES } from '../common';

const lineColor = '#C5CCD7';

enum MAP_SHAPES {
  ELLIPSE = 'ellipse',
  RECTANGLE = 'rectangle',
  DIAMOND = 'diamond',
}

function shapeForNode(el: cytoscape.NodeSingular): MAP_SHAPES {
  const type = el.data('type');
  switch (type) {
    case JOB_MAP_NODE_TYPES.ANALYTICS:
      return MAP_SHAPES.ELLIPSE;
    case JOB_MAP_NODE_TYPES.TRANSFORM:
      return MAP_SHAPES.RECTANGLE;
    case JOB_MAP_NODE_TYPES.INDEX_PATTERN:
      return MAP_SHAPES.DIAMOND;
    default:
      return MAP_SHAPES.ELLIPSE;
  }
}

function colorForNode(el: cytoscape.NodeSingular) {
  const type = el.data('type');
  switch (type) {
    case JOB_MAP_NODE_TYPES.ANALYTICS:
      return theme.euiColorVis0;
    case JOB_MAP_NODE_TYPES.TRANSFORM:
      return theme.euiColorVis1;
    case JOB_MAP_NODE_TYPES.INDEX_PATTERN:
      return theme.euiColorVis2;
    default:
      return 'white';
  }
}

export const cytoscapeOptions: cytoscape.CytoscapeOptions = {
  autoungrabify: true,
  boxSelectionEnabled: false,
  maxZoom: 3,
  minZoom: 0.2,
  // @ts-ignore
  style: [
    {
      selector: 'node',
      style: {
        'background-color': (el: cytoscape.NodeSingular) => colorForNode(el),
        'background-height': '60%',
        'background-width': '60%',
        'border-color': (el: cytoscape.NodeSingular) =>
          el.selected() ? theme.euiColorPrimary : theme.euiColorMediumShade,
        'border-width': 2,
        // @ts-ignore
        color: theme.textColors.default,
        'font-family': 'Inter UI, Segoe UI, Helvetica, Arial, sans-serif',
        'font-size': theme.euiFontSizeXS,
        // @ts-ignore
        'min-zoomed-font-size': theme.euiSizeL,
        label: 'data(label)',
        shape: (el: cytoscape.NodeSingular) => shapeForNode(el),
        'text-background-color': theme.euiColorLightestShade,
        'text-background-opacity': 0,
        // @ts-ignore
        'text-background-padding': theme.paddingSizes.xs,
        'text-background-shape': 'roundrectangle',
        // @ts-ignore
        'text-margin-y': theme.paddingSizes.s,
        'text-max-width': '200px',
        'text-valign': 'bottom',
        'text-wrap': 'ellipsis',
      },
    },
    {
      selector: 'edge',
      style: {
        'curve-style': 'taxi',
        // @ts-ignore
        'taxi-direction': 'rightward',
        'line-color': lineColor,
        'overlay-opacity': 0,
        'target-arrow-color': lineColor,
        'target-arrow-shape': 'triangle',
        // @ts-ignore
        'target-distance-from-node': theme.paddingSizes.xs,
        width: 1,
        'source-arrow-shape': 'none',
      },
    },
  ],
};
