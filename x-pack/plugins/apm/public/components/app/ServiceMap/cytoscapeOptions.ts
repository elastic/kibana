/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import theme from '@elastic/eui/dist/eui_theme_light.json';
import cytoscape from 'cytoscape';
import { CSSProperties } from 'react';
import {
  SERVICE_NAME,
  SPAN_DESTINATION_SERVICE_RESOURCE
} from '../../../../common/elasticsearch_fieldnames';
import { defaultIcon, iconForNode } from './icons';

// IE 11 does not properly load some SVGs or draw certain shapes. This causes
// a runtime error and the map fails work at all. We would prefer to do some
// kind of feature detection rather than browser detection, but some of these
// limitations are not well documented for older browsers.
//
// This method of detecting IE is from a Stack Overflow answer:
// https://stackoverflow.com/a/21825207
//
// @ts-ignore `documentMode` is not recognized as a valid property of `document`.
const isIE11 = !!window.MSInputMethodContext && !!document.documentMode;

export const animationOptions: cytoscape.AnimationOptions = {
  duration: parseInt(theme.euiAnimSpeedNormal, 10),
  // @ts-ignore The cubic-bezier options here are not recognized by the cytoscape types
  easing: theme.euiAnimSlightBounce
};
const lineColor = '#C5CCD7';
const zIndexNode = 200;
const zIndexEdge = 100;
const zIndexEdgeHighlight = 110;
const zIndexEdgeHover = 120;
export const nodeHeight = parseInt(theme.avatarSizing.l.size, 10);

function isService(el: cytoscape.NodeSingular) {
  return el.data(SERVICE_NAME) !== undefined;
}

const style: cytoscape.Stylesheet[] = [
  {
    selector: 'node',
    style: {
      'background-color': 'white',
      // The DefinitelyTyped definitions don't specify that a function can be
      // used here.
      //
      // @ts-ignore
      'background-image': isIE11
        ? undefined
        : (el: cytoscape.NodeSingular) => iconForNode(el) ?? defaultIcon,
      'background-height': (el: cytoscape.NodeSingular) =>
        isService(el) ? '60%' : '40%',
      'background-width': (el: cytoscape.NodeSingular) =>
        isService(el) ? '60%' : '40%',
      'border-color': (el: cytoscape.NodeSingular) =>
        el.hasClass('primary') || el.selected()
          ? theme.euiColorPrimary
          : theme.euiColorMediumShade,
      'border-width': 2,
      color: (el: cytoscape.NodeSingular) =>
        el.hasClass('primary') || el.selected()
          ? theme.euiColorPrimaryText
          : theme.textColors.text,
      // theme.euiFontFamily doesn't work here for some reason, so we're just
      // specifying a subset of the fonts for the label text.
      'font-family': 'Inter UI, Segoe UI, Helvetica, Arial, sans-serif',
      'font-size': theme.euiFontSizeXS,
      ghost: 'yes',
      'ghost-offset-x': 0,
      'ghost-offset-y': 2,
      'ghost-opacity': 0.15,
      height: nodeHeight,
      label: (el: cytoscape.NodeSingular) =>
        isService(el)
          ? el.data(SERVICE_NAME)
          : el.data(SPAN_DESTINATION_SERVICE_RESOURCE),
      'min-zoomed-font-size': parseInt(theme.euiSizeL, 10),
      'overlay-opacity': 0,
      shape: (el: cytoscape.NodeSingular) =>
        isService(el) ? (isIE11 ? 'rectangle' : 'ellipse') : 'diamond',
      'text-background-color': theme.euiColorPrimary,
      'text-background-opacity': (el: cytoscape.NodeSingular) =>
        el.hasClass('primary') || el.selected() ? 0.1 : 0,
      'text-background-padding': theme.paddingSizes.xs,
      'text-background-shape': 'roundrectangle',
      'text-margin-y': parseInt(theme.paddingSizes.s, 10),
      'text-max-width': '200px',
      'text-valign': 'bottom',
      'text-wrap': 'ellipsis',
      width: theme.avatarSizing.l.size,
      'z-index': zIndexNode
    }
  },
  {
    selector: 'edge',
    style: {
      'curve-style': 'taxi',
      // @ts-ignore
      'taxi-direction': 'auto',
      'line-color': lineColor,
      'overlay-opacity': 0,
      'target-arrow-color': lineColor,
      'target-arrow-shape': isIE11 ? 'none' : 'triangle',
      // The DefinitelyTyped definitions don't specify this property since it's
      // fairly new.
      //
      // @ts-ignore
      'target-distance-from-node': isIE11 ? undefined : theme.paddingSizes.xs,
      width: 1,
      'source-arrow-shape': 'none',
      'z-index': zIndexEdge
    }
  },
  {
    selector: 'edge[bidirectional]',
    style: {
      'source-arrow-shape': isIE11 ? 'none' : 'triangle',
      'source-arrow-color': lineColor,
      'target-arrow-shape': isIE11 ? 'none' : 'triangle',
      // @ts-ignore
      'source-distance-from-node': isIE11
        ? undefined
        : parseInt(theme.paddingSizes.xs, 10),
      'target-distance-from-node': isIE11
        ? undefined
        : parseInt(theme.paddingSizes.xs, 10)
    }
  },
  // @ts-ignore DefinitelyTyped says visibility is "none" but it's
  // actually "hidden"
  {
    selector: 'edge[isInverseEdge]',
    style: { visibility: 'hidden' }
  },
  {
    selector: 'edge.nodeHover',
    style: {
      width: 2,
      // @ts-ignore
      'z-index': zIndexEdgeHover,
      'line-color': theme.euiColorDarkShade,
      'source-arrow-color': theme.euiColorDarkShade,
      'target-arrow-color': theme.euiColorDarkShade
    }
  },
  {
    selector: 'node.hover',
    style: {
      'border-width': 2
    }
  },
  {
    selector: 'edge.highlight',
    style: {
      width: 2,
      'line-color': theme.euiColorPrimary,
      'source-arrow-color': theme.euiColorPrimary,
      'target-arrow-color': theme.euiColorPrimary,
      // @ts-ignore
      'z-index': zIndexEdgeHighlight
    }
  }
];

// The CSS styles for the div containing the cytoscape element. Makes a
// background grid of dots.
export const cytoscapeDivStyle: CSSProperties = {
  background: `linear-gradient(
  90deg,
  ${theme.euiPageBackgroundColor}
    calc(${theme.euiSizeL} - calc(${theme.euiSizeXS} / 2)),
  transparent 1%
)
center,
linear-gradient(
  ${theme.euiPageBackgroundColor}
    calc(${theme.euiSizeL} - calc(${theme.euiSizeXS} / 2)),
  transparent 1%
)
center,
${theme.euiColorLightShade}`,
  backgroundSize: `${theme.euiSizeL} ${theme.euiSizeL}`,
  margin: `-${theme.gutterTypes.gutterLarge}`,
  marginTop: 0
};

export const cytoscapeOptions: cytoscape.CytoscapeOptions = {
  autoungrabify: true,
  boxSelectionEnabled: false,
  maxZoom: 3,
  minZoom: 0.2,
  style
};
