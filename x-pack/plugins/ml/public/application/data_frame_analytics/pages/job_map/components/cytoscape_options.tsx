/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import cytoscape from 'cytoscape';
import {
  ANALYSIS_CONFIG_TYPE,
  JOB_MAP_NODE_TYPES,
} from '../../../../../../common/constants/data_frame_analytics';
import { EuiThemeType } from '../../../../components/color_range_legend';
import classificationJobIcon from './icons/ml_classification_job.svg';
import outlierDetectionJobIcon from './icons/ml_outlier_detection_job.svg';
import regressionJobIcon from './icons/ml_regression_job.svg';

const lineColor = '#C5CCD7';

const MAP_SHAPES = {
  ELLIPSE: 'ellipse',
  RECTANGLE: 'rectangle',
  DIAMOND: 'diamond',
  TRIANGLE: 'triangle',
} as const;
type MapShapes = typeof MAP_SHAPES[keyof typeof MAP_SHAPES];

function shapeForNode(el: cytoscape.NodeSingular, theme: EuiThemeType): MapShapes {
  const type = el.data('type');
  switch (type) {
    case JOB_MAP_NODE_TYPES.ANALYTICS:
      return MAP_SHAPES.ELLIPSE;
    case JOB_MAP_NODE_TYPES.TRANSFORM:
      return MAP_SHAPES.RECTANGLE;
    case JOB_MAP_NODE_TYPES.INDEX:
      return MAP_SHAPES.DIAMOND;
    case JOB_MAP_NODE_TYPES.TRAINED_MODEL:
      return MAP_SHAPES.TRIANGLE;
    default:
      return MAP_SHAPES.ELLIPSE;
  }
}

function iconForNode(el: cytoscape.NodeSingular) {
  const type = el.data('analysisType');

  switch (type) {
    case ANALYSIS_CONFIG_TYPE.OUTLIER_DETECTION:
      return outlierDetectionJobIcon;
    case ANALYSIS_CONFIG_TYPE.CLASSIFICATION:
      return classificationJobIcon;
    case ANALYSIS_CONFIG_TYPE.REGRESSION:
      return regressionJobIcon;
    default:
      return undefined;
  }
}

function borderColorForNode(el: cytoscape.NodeSingular, theme: EuiThemeType) {
  if (el.selected()) {
    return theme.euiColorPrimary;
  }

  const type = el.data('type');

  switch (type) {
    case JOB_MAP_NODE_TYPES.ANALYTICS:
      return theme.euiColorSuccess;
    case JOB_MAP_NODE_TYPES.TRANSFORM:
      return theme.euiColorVis1;
    case JOB_MAP_NODE_TYPES.INDEX:
      return theme.euiColorVis2;
    case JOB_MAP_NODE_TYPES.TRAINED_MODEL:
      return theme.euiColorVis3;
    default:
      return theme.euiColorMediumShade;
  }
}

export const getCytoscapeOptions = (theme: EuiThemeType): cytoscape.CytoscapeOptions => ({
  autoungrabify: true,
  boxSelectionEnabled: false,
  maxZoom: 3,
  minZoom: 0.2,
  style: [
    {
      selector: 'node',
      style: {
        'background-color': (el: cytoscape.NodeSingular) =>
          el.data('isRoot') ? theme.euiColorWarning : theme.euiColorGhost,
        'background-height': '60%',
        'background-width': '60%',
        'border-color': (el: cytoscape.NodeSingular) => borderColorForNode(el, theme),
        'border-style': 'solid',
        // @ts-ignore
        'background-image': (el: cytoscape.NodeSingular) => iconForNode(el),
        'border-width': (el: cytoscape.NodeSingular) => (el.selected() ? 4 : 3),
        // @ts-ignore
        color: theme.euiTextColors.default,
        'font-family': 'Inter UI, Segoe UI, Helvetica, Arial, sans-serif',
        'font-size': theme.euiFontSizeXS,
        'min-zoomed-font-size': parseInt(theme.euiSizeL, 10),
        label: 'data(label)',
        shape: (el: cytoscape.NodeSingular) => shapeForNode(el, theme),
        'text-background-color': theme.euiColorLightestShade,
        'text-background-opacity': 0,
        'text-background-padding': theme.paddingSizes.xs,
        'text-background-shape': 'roundrectangle',
        'text-margin-y': parseInt(theme.paddingSizes.s, 10),
        'text-max-width': '200px',
        'text-valign': 'bottom',
        'text-wrap': 'wrap',
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
});
