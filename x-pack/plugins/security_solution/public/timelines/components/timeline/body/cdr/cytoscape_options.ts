/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type cytoscape from 'cytoscape';
import type { CSSProperties } from 'react';
import type { EuiTheme } from '@kbn/kibana-react-plugin/common';

// import { FETCH_STATUS } from '../../../hooks/use_fetcher';
// import { AGENT_NAME, SPAN_SUBTYPE, SPAN_TYPE } from '@kbn/apm-plugin/common/es_fields/apm';
// import { getAgentIcon } from '@kbn/custom-icons';
// import { getSpanIcon } from '@kbn/apm-plugin/public/components/shared/span_icon/get_span_icon';
// import { iconForNode } from './icons';
import ipIcon from './ip.svg';
import userIcon from './user.svg';

export enum FETCH_STATUS {
  LOADING = 'loading',
  SUCCESS = 'success',
  FAILURE = 'failure',
  NOT_INITIATED = 'not_initiated',
}
export const SERVICE_NAME = 'service.name';
export const SPAN_DESTINATION_SERVICE_RESOURCE = 'span.destination.service.resource';

export enum ServiceHealthStatus {
  healthy = 'healthy',
  critical = 'critical',
  warning = 'warning',
  unknown = 'unknown',
}
export function iconForNode(node: cytoscape.NodeSingular) {
  const id = node.data('id');
  if (id.startsWith('source-ip-')) {
    return ipIcon;
  }
  if (id.startsWith('user')) {
    return userIcon;
  }
  return undefined;
}

export function getServiceHealthStatusColor(theme: EuiTheme, status: ServiceHealthStatus) {
  switch (status) {
    case ServiceHealthStatus.healthy:
      return theme.eui.euiColorVis0;
    case ServiceHealthStatus.warning:
      return theme.eui.euiColorVis5;
    case ServiceHealthStatus.critical:
      return theme.eui.euiColorVis9;
    case ServiceHealthStatus.unknown:
      return theme.eui.euiColorMediumShade;
  }
}
export interface AnomalyStats {
  transactionType?: string;
  anomalyScore?: number;
  actualValue?: number;
  jobId?: string;
  healthStatus: ServiceHealthStatus;
}

export const popoverWidth = 350;

function getServiceAnomalyStats(el: cytoscape.NodeSingular) {
  const serviceAnomalyStats: AnomalyStats | undefined = el.data('serviceAnomalyStats');

  return serviceAnomalyStats;
}

function getBorderColorFn(
  theme: EuiTheme
): cytoscape.Css.MapperFunction<cytoscape.NodeSingular, string> {
  return (el: cytoscape.NodeSingular) => {
    const hasAnomalyDetectionJob = el.data('serviceAnomalyStats') !== undefined;
    const anomalyStats = getServiceAnomalyStats(el);
    if (hasAnomalyDetectionJob) {
      return getServiceHealthStatusColor(
        theme,
        anomalyStats?.healthStatus ?? ServiceHealthStatus.unknown
      );
    }
    if (el.hasClass('primary') || el.selected()) {
      return theme.eui.euiColorPrimary;
    }
    return theme.eui.euiColorMediumShade;
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

export const getAnimationOptions = (theme: EuiTheme): cytoscape.AnimationOptions => ({
  duration: parseInt(theme.eui.euiAnimSpeedNormal, 10),
  // @ts-expect-error The cubic-bezier options here are not recognized by the cytoscape types
  easing: theme.eui.euiAnimSlightBounce,
});

const zIndexNode = 200;
const zIndexEdge = 100;
const zIndexEdgeHighlight = 110;
const zIndexEdgeHover = 120;

export const getNodeHeight = (theme: EuiTheme): number => parseInt(theme.eui.euiSizeXXL, 10);

function isService(el: cytoscape.NodeSingular) {
  return el.data(SERVICE_NAME) !== undefined;
}

const getStyle = (theme: EuiTheme, isTraceExplorerEnabled: boolean): cytoscape.Stylesheet[] => {
  const lineColor = theme.eui.euiColorMediumShade;
  return [
    {
      selector: 'core',
      // @ts-expect-error DefinitelyTyped does not recognize 'active-bg-opacity'
      style: { 'active-bg-opacity': 0 },
    },
    {
      selector: 'node',
      style: {
        'background-color': theme.eui.euiColorGhost,
        // The DefinitelyTyped definitions don't specify that a function can be
        // used here.
        'background-image': (el: cytoscape.NodeSingular) => iconForNode(el),
        'background-height': (el: cytoscape.NodeSingular) => (isService(el) ? '60%' : '40%'),
        'background-width': (el: cytoscape.NodeSingular) => (isService(el) ? '60%' : '40%'),
        'border-color': getBorderColorFn(theme),
        'border-style': getBorderStyle,
        'border-width': getBorderWidth,
        color: (el: cytoscape.NodeSingular) =>
          el.hasClass('primary') || el.selected()
            ? theme.eui.euiColorPrimaryText
            : theme.eui.euiTextColor,
        // theme.euiFontFamily doesn't work here for some reason, so we're just
        // specifying a subset of the fonts for the label text.
        'font-family': 'Inter UI, Segoe UI, Helvetica, Arial, sans-serif',
        'font-size': theme.eui.euiFontSizeS,
        ghost: 'yes',
        'ghost-offset-x': 0,
        'ghost-offset-y': 2,
        'ghost-opacity': 0.15,
        height: getNodeHeight(theme),
        label: (el: cytoscape.NodeSingular) =>
          isService(el)
            ? el.data(SERVICE_NAME)
            : el.data('label') || el.data(SPAN_DESTINATION_SERVICE_RESOURCE),
        'min-zoomed-font-size': parseInt(theme.eui.euiSizeS, 10),
        'overlay-opacity': 0,
        shape: (el: cytoscape.NodeSingular) =>
          isService(el) ? (isIE11 ? 'rectangle' : 'ellipse') : 'roundrectangle',
        'text-background-color': theme.eui.euiColorPrimary,
        'text-background-opacity': (el: cytoscape.NodeSingular) =>
          el.hasClass('primary') || el.selected() ? 0.1 : 0,
        'text-background-padding': theme.eui.euiSizeXS,
        'text-background-shape': 'roundrectangle',
        'text-margin-y': parseInt(theme.eui.euiSizeS, 10),
        'text-max-width': '200px',
        'text-valign': 'bottom',
        'text-wrap': 'ellipsis',
        width: theme.eui.euiSizeXXL,
        'z-index': zIndexNode,
      },
    },
    // {
    //   selector: 'node.event-node-border',
    //   style: {
    //     ghost: 'no',
    //     shape: 'star',
    //     'background-color': '#FFF9E8',
    //     'border-color': '#FEC514',
    //     'border-width': 2,
    //     'background-image': 'none',
    //     width: '160px',
    //     // padding: '10px', // Adjust as needed for visual appearance
    //   },
    // },
    {
      selector: 'node.event-node',
      style: {
        ghost: 'yes',
        shape: 'triangle',
        'text-margin-y': parseInt(theme.eui.euiSizeS, 10),
        'text-valign': 'bottom',
        'text-halign': 'center',
        'font-size': '12px',
        'text-wrap': 'wrap',
        'text-max-width': '140px',
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
        'target-distance-from-node': isIE11 ? undefined : theme.eui.euiSizeXS,
        width: 1,
        'source-arrow-shape': 'none',
        'z-index': zIndexEdge,
        label: 'data(label)', // maps to data.label
        'text-border-opacity': 1,
        'text-border-color': '#fec515',
        'text-border-style': 'solid',
        'text-border-width': '1px',
        'text-background-color': '#fff9e8',
        'text-background-opacity': 1,
        'text-background-padding': '15px',
        'font-size': '12px',
      },
    },
    {
      selector: 'edge[bidirectional]',
      style: {
        'source-arrow-shape': isIE11 ? 'none' : 'triangle',
        'source-arrow-color': lineColor,
        'target-arrow-shape': isIE11 ? 'none' : 'triangle',
        // @ts-expect-error
        'source-distance-from-node': isIE11 ? undefined : parseInt(theme.eui.euiSizeXS, 10),
        'target-distance-from-node': isIE11 ? undefined : parseInt(theme.eui.euiSizeXS, 10),
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
        'line-color': theme.eui.euiColorDarkShade,
        'source-arrow-color': theme.eui.euiColorDarkShade,
        'target-arrow-color': theme.eui.euiColorDarkShade,
      },
    },
    ...(isTraceExplorerEnabled
      ? [
          {
            selector: 'edge.hover',
            style: {
              width: 4,
              'z-index': zIndexEdgeHover,
              'line-color': theme.eui.euiColorDarkShade,
              'source-arrow-color': theme.eui.euiColorDarkShade,
              'target-arrow-color': theme.eui.euiColorDarkShade,
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
      selector: 'node.event-node.hover',
      style: {
        'border-width': 0,
      },
    },
    {
      selector: 'edge.highlight',
      style: {
        width: 4,
        'line-color': theme.eui.euiColorPrimary,
        'source-arrow-color': theme.eui.euiColorPrimary,
        'target-arrow-color': theme.eui.euiColorPrimary,
        'z-index': zIndexEdgeHighlight,
      },
    },
  ];
};

// The CSS styles for the div containing the cytoscape element. Makes a
// background grid of dots.
// export const getCytoscapeDivStyle = (theme: EuiTheme, status: FETCH_STATUS): CSSProperties => ({
export const getCytoscapeDivStyle = (theme: EuiTheme): CSSProperties => ({
  background: `linear-gradient(
  90deg,
  ${theme.eui.euiPageBackgroundColor}
    calc(${theme.eui.euiSizeL} - calc(${theme.eui.euiSizeXS} / 2)),
  transparent 1%
)
center,
linear-gradient(
  ${theme.eui.euiPageBackgroundColor}
    calc(${theme.eui.euiSizeL} - calc(${theme.eui.euiSizeXS} / 2)),
  transparent 1%
)
center,
${theme.eui.euiColorLightShade}`,
  backgroundSize: `${theme.eui.euiSizeL} ${theme.eui.euiSizeL}`,
  // cursor: `${status === FETCH_STATUS.LOADING ? 'wait' : 'grab'}`,
  cursor: `grab`,
  marginTop: 0,
});

export const getCytoscapeOptions = (
  theme: EuiTheme,
  isTraceExplorerEnabled: boolean
): cytoscape.CytoscapeOptions => ({
  boxSelectionEnabled: false,
  maxZoom: 3,
  minZoom: 0.2,
  style: getStyle(theme, isTraceExplorerEnabled),
});
