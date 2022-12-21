/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import cytoscape from 'cytoscape';
import { debounce } from 'lodash';
import { useEffect } from 'react';
import { EuiTheme } from '@kbn/kibana-react-plugin/common';
import { useUiTracker } from '@kbn/observability-plugin/public';
import { getAnimationOptions, getNodeHeight } from './cytoscape_options';

/*
 * @notice
 * This product includes code in the function applyCubicBezierStyles that was
 * inspired by a public Codepen, which was available under a "MIT" license.
 *
 * Copyright (c) 2020 by Guillaume (https://codepen.io/guillaumethomas/pen/xxbbBKO)
 * MIT License http://www.opensource.org/licenses/mit-license
 */
function applyCubicBezierStyles(edges: cytoscape.EdgeCollection) {
  edges.forEach((edge) => {
    const { x: x0, y: y0 } = edge.source().position();
    const { x: x1, y: y1 } = edge.target().position();
    const x = x1 - x0;
    const y = y1 - y0;
    const z = Math.sqrt(x * x + y * y);
    const costheta = z === 0 ? 0 : x / z;
    const alpha = 0.25;
    // Two values for control-point-distances represent a pair symmetric quadratic
    // bezier curves joined in the middle as a seamless cubic bezier curve:
    edge.style('control-point-distances', [
      -alpha * y * costheta,
      alpha * y * costheta,
    ]);
    edge.style('control-point-weights', [alpha, 1 - alpha]);
  });
}

function getLayoutOptions({
  fit = false,
  nodeHeight,
  theme,
}: {
  fit?: boolean;
  nodeHeight: number;
  theme: EuiTheme;
}): cytoscape.LayoutOptions {
  const animationOptions = getAnimationOptions(theme);

  // @ts-expect-error Some of the dagre-specific layout options don't work with
  // the types.
  return {
    animationDuration: animationOptions.duration,
    animationEasing: animationOptions.easing,
    fit,
    name: 'dagre',
    animate: !fit,
    padding: nodeHeight,
    spacingFactor: 1.2,
    nodeSep: nodeHeight,
    edgeSep: 32,
    rankSep: 128,
    rankDir: 'LR',
    ranker: 'network-simplex',
  };
}

function setCursor(cursor: string, event: cytoscape.EventObjectCore) {
  const container = event.cy.container();

  if (container) {
    container.style.cursor = cursor;
  }
}

function resetConnectedEdgeStyle(
  cytoscapeInstance: cytoscape.Core,
  node?: cytoscape.NodeSingular
) {
  cytoscapeInstance.edges().removeClass('highlight');
  if (node) {
    node.connectedEdges().addClass('highlight');
  }
}

export function useCytoscapeEventHandlers({
  cy,
  serviceName,
  theme,
}: {
  cy?: cytoscape.Core;
  serviceName?: string;
  theme: EuiTheme;
}) {
  const trackApmEvent = useUiTracker({ app: 'apm' });

  useEffect(() => {
    const nodeHeight = getNodeHeight(theme);

    const dataHandler: cytoscape.EventHandler = (event, fit) => {
      if (serviceName) {
        const node = event.cy.getElementById(serviceName);
        resetConnectedEdgeStyle(event.cy, node);
        // Add the "primary" class to the node if its id matches the serviceName.
        if (event.cy.nodes().length > 0) {
          event.cy.nodes().removeClass('primary');
          node.addClass('primary');
        }
      } else {
        resetConnectedEdgeStyle(event.cy);
      }

      // Run the layout on nodes that are not selected and have not been manually
      // positioned.
      event.cy
        .elements('[!hasBeenDragged]')
        .difference('node:selected')
        .layout(getLayoutOptions({ fit, nodeHeight, theme }))
        .run();
    };

    const layoutstopHandler: cytoscape.EventHandler = (event) => {
      applyCubicBezierStyles(event.cy.edges());
    };

    // debounce hover tracking so it doesn't spam telemetry with redundant events
    const trackNodeEdgeHover = debounce(
      () => trackApmEvent({ metric: 'service_map_node_or_edge_hover' }),
      1000
    );

    const mouseoverHandler: cytoscape.EventHandler = (event) => {
      if (event.target.isNode()) {
        setCursor('pointer', event);
      }

      trackNodeEdgeHover();
      event.target.addClass('hover');
      event.target.connectedEdges().addClass('nodeHover');
    };
    const mouseoutHandler: cytoscape.EventHandler = (event) => {
      setCursor('grab', event);

      event.target.removeClass('hover');
      event.target.connectedEdges().removeClass('nodeHover');
    };
    const selectHandler: cytoscape.EventHandler = (event) => {
      trackApmEvent({ metric: 'service_map_node_select' });
      resetConnectedEdgeStyle(event.cy, event.target);
    };
    const unselectHandler: cytoscape.EventHandler = (event) => {
      resetConnectedEdgeStyle(
        event.cy,
        serviceName ? event.cy.getElementById(serviceName) : undefined
      );
    };
    const debugHandler: cytoscape.EventHandler = (event) => {
      const debugEnabled = sessionStorage.getItem('apm_debug') === 'true';
      if (debugEnabled) {
        // eslint-disable-next-line no-console
        console.debug('cytoscape:', event);
      }
    };
    const dragHandler: cytoscape.EventHandler = (event) => {
      setCursor('grabbing', event);

      applyCubicBezierStyles(event.target.connectedEdges());

      if (!event.target.data('hasBeenDragged')) {
        event.target.data('hasBeenDragged', true);
      }
    };
    const dragfreeHandler: cytoscape.EventHandler = (event) => {
      setCursor('pointer', event);
    };
    const tapstartHandler: cytoscape.EventHandler = (event) => {
      // Onle set cursot to "grabbing" if the target doesn't have an "isNode"
      // property (meaning it's the canvas) or if "isNode" is false (meaning
      // it's an edge.)
      if (!event.target.isNode || !event.target.isNode()) {
        setCursor('grabbing', event);
      }
    };
    const tapendHandler: cytoscape.EventHandler = (event) => {
      if (!event.target.isNode || !event.target.isNode()) {
        setCursor('grab', event);
      }
    };

    if (cy) {
      cy.on(
        'custom:data drag dragfree layoutstop select tapstart tapend unselect',
        debugHandler
      );
      cy.on('custom:data', dataHandler);
      cy.on('layoutstop', layoutstopHandler);
      cy.on('mouseover', 'edge, node', mouseoverHandler);
      cy.on('mouseout', 'edge, node', mouseoutHandler);
      cy.on('select', 'node', selectHandler);
      cy.on('unselect', 'node', unselectHandler);
      cy.on('drag', 'node', dragHandler);
      cy.on('dragfree', 'node', dragfreeHandler);
      cy.on('tapstart', tapstartHandler);
      cy.on('tapend', tapendHandler);
    }

    return () => {
      if (cy) {
        cy.removeListener(
          'custom:data drag dragfree layoutstop select tapstart tapend unselect',
          undefined,
          debugHandler
        );
        cy.removeListener('custom:data', undefined, dataHandler);
        cy.removeListener('layoutstop', undefined, layoutstopHandler);
        cy.removeListener('mouseover', 'edge, node', mouseoverHandler);
        cy.removeListener('mouseout', 'edge, node', mouseoutHandler);
        cy.removeListener('select', 'node', selectHandler);
        cy.removeListener('unselect', 'node', unselectHandler);
        cy.removeListener('drag', 'node', dragHandler);
        cy.removeListener('dragfree', 'node', dragfreeHandler);
        cy.removeListener('tapstart', undefined, tapstartHandler);
        cy.removeListener('tapend', undefined, tapendHandler);
      }
    };
  }, [cy, serviceName, trackApmEvent, theme]);
}
