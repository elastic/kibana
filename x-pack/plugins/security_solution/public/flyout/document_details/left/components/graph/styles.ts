/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type cytoscape from 'cytoscape';
import type { EuiTheme } from '@kbn/kibana-react-plugin/common';
import type { Severity } from '@kbn/securitysolution-io-ts-alerting-types';
import { iconForNode } from './icons';

const zIndexNode = 200;
const zIndexEdge = 100;
const zIndexEdgeHighlight = 110;
const zIndexEdgeHover = 120;

const getSeverityColor = (theme: EuiTheme, status: Severity) => {
  switch (status) {
    case 'low':
      return theme.eui.euiColorVis0;
    case 'medium':
      return theme.eui.euiColorVis5;
    case 'high':
      return theme.eui.euiColorVis7;
    case 'critical':
      return theme.eui.euiColorVis9;
  }
};

const getColor = (theme: EuiTheme) => {
  return (el: cytoscape.NodeSingular) => {
    const hasSeverity = el.data('severity') !== undefined;
    if (hasSeverity) {
      return getSeverityColor(theme, el.data('severity'));
    }
    return theme.eui.euiColorLightShade;
  };
};

const getNodeHeight = (theme: EuiTheme): number => parseInt(theme.eui.euiSizeXXL, 10);

export const getStyle = (theme: EuiTheme): cytoscape.Stylesheet[] => {
  const lineColor = theme.eui.euiColorMediumShade;
  return [
    {
      selector: 'node',
      style: {
        color: theme.eui.euiTextColor,
        height: getNodeHeight(theme),
        width: theme.eui.euiSizeXXL,
        shape: 'ellipse',
        'z-index': zIndexNode,
        'background-color': getColor(theme),
        'background-image': (el: cytoscape.NodeSingular) => iconForNode(el),
        'background-height': '60%',
        'background-width': '60%',
        'overlay-opacity': 0,
        label: (el: cytoscape.NodeSingular) => el.data('label'),
        'font-family': 'Inter UI, Segoe UI, Helvetica, Arial, sans-serif',
        'font-size': 12,
        'min-zoomed-font-size': 12,
        'text-background-color': theme.eui.euiColorPrimary,
        'text-background-opacity': (el: cytoscape.NodeSingular) => (el.selected() ? 0.1 : 0),
        'text-background-padding': theme.eui.euiSizeXS,
        'text-background-shape': 'roundrectangle',
        'text-margin-y': parseInt(theme.eui.euiSizeXS, 10),
        'text-max-width': '150px',
        'text-valign': 'bottom',
        'text-wrap': 'none',
        ghost: 'yes',
        'ghost-offset-x': 0,
        'ghost-offset-y': 2,
        'ghost-opacity': 0.15,
      },
    },
    {
      selector: 'edge',
      style: {
        'curve-style': 'straight',
        // border: (el: cytoscape.EdgeSingular) => (el.data('type') === 'related' ? 'dot' : 'solid'),
        'line-color': lineColor,
        'overlay-opacity': 0,
        'target-arrow-color': lineColor,
        'target-arrow-shape': 'none',
        'line-style': (el: cytoscape.EdgeSingular) =>
          el.data('type') === 'related' ? 'dotted' : 'solid',

        // The DefinitelyTyped definitions don't specify this property since it's
        // fairly new.
        //
        // @ts-expect-error
        'target-distance-from-node': theme.eui.euiSizeS,
        width: 1,
        'source-arrow-shape': 'none',
        'z-index': zIndexEdge,
      },
    },
    {
      selector: 'edge.nodeHover',
      style: {
        width: 1,
        'z-index': zIndexEdgeHover,
        'line-color': theme.eui.euiColorDarkShade,
        'source-arrow-color': theme.eui.euiColorDarkShade,
        'target-arrow-color': theme.eui.euiColorDarkShade,
        label: (el: cytoscape.EdgeSingular) => el.data('label'),
        color: theme.eui.euiColorDarkShade,
        'font-size': 10,
        // 'text-margin-y': -parseInt(theme.eui.euiSizeS, 10),
        // @ts-expect-error
        'text-rotation': 'autorotate',
        'text-background-color': 'white',
        'text-background-opacity': 0.6,
      },
    },
    {
      selector: 'node.hover',
      style: {
        'border-width': 2,
      },
    },
    {
      selector: 'edge.highlight',
      style: {
        width: 2,
        'z-index': zIndexEdgeHighlight,
      },
    },
  ];
};
