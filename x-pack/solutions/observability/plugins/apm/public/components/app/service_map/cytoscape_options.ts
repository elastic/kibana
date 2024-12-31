/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import cytoscape from 'cytoscape';
import { CSSProperties } from 'react';
import type { EuiThemeComputed } from '@elastic/eui';
import { ServiceAnomalyStats } from '../../../../common/anomaly_detection';
import { SERVICE_NAME, SPAN_DESTINATION_SERVICE_RESOURCE } from '../../../../common/es_fields/apm';
import {
  getServiceHealthStatusColor,
  ServiceHealthStatus,
} from '../../../../common/service_health_status';
import { FETCH_STATUS } from '../../../hooks/use_fetcher';
import { iconForNode } from './icons';

export const popoverWidth = 350;

function getServiceAnomalyStats(el: cytoscape.NodeSingular) {
  const serviceAnomalyStats: ServiceAnomalyStats | undefined = el.data('serviceAnomalyStats');

  return serviceAnomalyStats;
}

function getBorderColorFn(
  euiTheme: EuiThemeComputed
): cytoscape.Css.MapperFunction<cytoscape.NodeSingular, string> {
  return (el: cytoscape.NodeSingular) => {
    const hasAnomalyDetectionJob = el.data('serviceAnomalyStats') !== undefined;
    const anomalyStats = getServiceAnomalyStats(el);
    if (hasAnomalyDetectionJob) {
      return getServiceHealthStatusColor(
        euiTheme,
        anomalyStats?.healthStatus ?? ServiceHealthStatus.unknown
      );
    }
    if (el.hasClass('primary') || el.selected()) {
      return euiTheme.colors.primary;
    }
    return euiTheme.colors.mediumShade;
  };
}

const getBorderStyle: cytoscape.Css.MapperFunction<
  cytoscape.NodeSingular,
  cytoscape.Css.LineStyle
> = (el: cytoscape.NodeSingular) => {
  const status = getServiceAnomalyStats(el)?.healthStatus;
  if (status === ServiceHealthStatus.critical) {
    return 'double';
  } else {
    return 'solid';
  }
};

function getBorderWidth(el: cytoscape.NodeSingular) {
  const status = getServiceAnomalyStats(el)?.healthStatus;

  if (status === ServiceHealthStatus.warning) {
    return 4;
  } else if (status === ServiceHealthStatus.critical) {
    return 8;
  } else {
    return 4;
  }
}

// IE 11 does not properly load some SVGs or draw certain shapes. This causes
// a runtime error and the map fails work at all. We would prefer to do some
// kind of feature detection rather than browser detection, but some of these
// limitations are not well documented for older browsers.
//
// This method of detecting IE is from a Stack Overflow answer:
// https://stackoverflow.com/a/21825207
//
// @ts-expect-error `documentMode` is not recognized as a valid property of `document`.
const isIE11 = !!window.MSInputMethodContext && !!document.documentMode;

export const getAnimationOptions = (euiTheme: EuiThemeComputed): cytoscape.AnimationOptions => ({
  duration: euiTheme.animation.normal ? parseInt(euiTheme.animation.normal, 10) : 0,
  // @ts-expect-error The cubic-bezier options here are not recognized by the cytoscape types
  easing: euiTheme.animation.bounce,
});

const zIndexNode = 200;
const zIndexEdge = 100;
const zIndexEdgeHighlight = 110;
const zIndexEdgeHover = 120;

export const getNodeHeight = (euiTheme: EuiThemeComputed): number =>
  parseInt(euiTheme.size.xxl, 10);

function isService(el: cytoscape.NodeSingular) {
  return el.data(SERVICE_NAME) !== undefined;
}

const getStyle = (
  euiTheme: EuiThemeComputed,
  isTraceExplorerEnabled: boolean
): cytoscape.Stylesheet[] => {
  const lineColor = euiTheme.colors.mediumShade;
  return [
    {
      selector: 'core',
      // @ts-expect-error DefinitelyTyped does not recognize 'active-bg-opacity'
      style: { 'active-bg-opacity': 0 },
    },
    {
      selector: 'node',
      style: {
        'background-color': euiTheme.colors.backgroundBasePlain,
        // The DefinitelyTyped definitions don't specify that a function can be
        // used here.
        'background-image': (el: cytoscape.NodeSingular) => iconForNode(el),
        'background-height': (el: cytoscape.NodeSingular) => (isService(el) ? '60%' : '40%'),
        'background-width': (el: cytoscape.NodeSingular) => (isService(el) ? '60%' : '40%'),
        'border-color': getBorderColorFn(euiTheme),
        'border-style': getBorderStyle,
        'border-width': getBorderWidth,
        color: (el: cytoscape.NodeSingular) =>
          el.hasClass('primary') || el.selected()
            ? euiTheme.colors.textPrimary
            : euiTheme.colors.textParagraph,
        // theme.euiFontFamily doesn't work here for some reason, so we're just
        // specifying a subset of the fonts for the label text.
        'font-family': 'Inter UI, Segoe UI, Helvetica, Arial, sans-serif',
        'font-size': euiTheme.size.s,
        ghost: 'yes',
        'ghost-offset-x': 0,
        'ghost-offset-y': 2,
        'ghost-opacity': 0.15,
        height: getNodeHeight(euiTheme),
        label: (el: cytoscape.NodeSingular) =>
          isService(el)
            ? el.data(SERVICE_NAME)
            : el.data('label') || el.data(SPAN_DESTINATION_SERVICE_RESOURCE),
        'min-zoomed-font-size': parseInt(euiTheme.size.s, 10),
        'overlay-opacity': 0,
        shape: (el: cytoscape.NodeSingular) =>
          isService(el) ? (isIE11 ? 'rectangle' : 'ellipse') : 'diamond',
        'text-background-color': euiTheme.colors.primary,
        'text-background-opacity': (el: cytoscape.NodeSingular) =>
          el.hasClass('primary') || el.selected() ? 0.1 : 0,
        'text-background-padding': euiTheme.size.xs,
        'text-background-shape': 'roundrectangle',
        'text-margin-y': parseInt(euiTheme.size.s, 10),
        'text-max-width': '200px',
        'text-valign': 'bottom',
        'text-wrap': 'ellipsis',
        width: euiTheme.size.xxl,
        'z-index': zIndexNode,
      },
    },
    {
      selector: 'edge',
      style: {
        'curve-style': 'unbundled-bezier',
        'line-color': lineColor,
        'overlay-opacity': 0,
        'target-arrow-color': lineColor,
        'target-arrow-shape': isIE11 ? 'none' : 'triangle',
        // The DefinitelyTyped definitions don't specify this property since it's
        // fairly new.
        //
        // @ts-expect-error
        'target-distance-from-node': isIE11 ? undefined : euiTheme.size.xs,
        width: 1,
        'source-arrow-shape': 'none',
        'z-index': zIndexEdge,
      },
    },
    {
      selector: 'edge[bidirectional]',
      style: {
        'source-arrow-shape': isIE11 ? 'none' : 'triangle',
        'source-arrow-color': lineColor,
        'target-arrow-shape': isIE11 ? 'none' : 'triangle',
        // @ts-expect-error
        'source-distance-from-node': isIE11 ? undefined : parseInt(euiTheme.size.xs, 10),
        'target-distance-from-node': isIE11 ? undefined : parseInt(euiTheme.size.xs, 10),
      },
    },
    {
      selector: 'edge[isInverseEdge]',
      // @ts-expect-error DefinitelyTyped says visibility is "none" but it's
      // actually "hidden"
      style: { visibility: 'hidden' },
    },
    {
      selector: 'edge.nodeHover',
      style: {
        width: 4,
        'z-index': zIndexEdgeHover,
        'line-color': euiTheme.colors.darkShade,
        'source-arrow-color': euiTheme.colors.darkShade,
        'target-arrow-color': euiTheme.colors.darkShade,
      },
    },
    ...(isTraceExplorerEnabled
      ? [
          {
            selector: 'edge.hover',
            style: {
              width: 4,
              'z-index': zIndexEdgeHover,
              'line-color': euiTheme.colors.darkShade,
              'source-arrow-color': euiTheme.colors.darkShade,
              'target-arrow-color': euiTheme.colors.darkShade,
            },
          },
        ]
      : []),
    {
      selector: 'node.hover',
      style: {
        'border-width': getBorderWidth,
      },
    },
    {
      selector: 'edge.highlight',
      style: {
        width: 4,
        'line-color': euiTheme.colors.primary,
        'source-arrow-color': euiTheme.colors.primary,
        'target-arrow-color': euiTheme.colors.primary,
        'z-index': zIndexEdgeHighlight,
      },
    },
  ];
};

// The CSS styles for the div containing the cytoscape element. Makes a
// background grid of dots.
export const getCytoscapeDivStyle = (
  euiTheme: EuiThemeComputed,
  status: FETCH_STATUS
): CSSProperties => ({
  background: `linear-gradient(
  90deg,
  ${euiTheme.colors.backgroundBasePlain}
    calc(${euiTheme.size.l} - calc(${euiTheme.size.xs} / 2)),
  transparent 1%
)
center,
linear-gradient(
  ${euiTheme.colors.backgroundBasePlain}
    calc(${euiTheme.size.l} - calc(${euiTheme.size.xs} / 2)),
  transparent 1%
)
center,
${euiTheme.colors.lightShade}`,
  backgroundSize: `${euiTheme.size.l} ${euiTheme.size.l}`,
  cursor: `${status === FETCH_STATUS.LOADING ? 'wait' : 'grab'}`,
  marginTop: 0,
});

export const getCytoscapeOptions = (
  euiTheme: EuiThemeComputed,
  isTraceExplorerEnabled: boolean
): cytoscape.CytoscapeOptions => ({
  boxSelectionEnabled: false,
  maxZoom: 3,
  minZoom: 0.2,
  style: getStyle(euiTheme, isTraceExplorerEnabled),
});
