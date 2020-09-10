/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import cytoscape from 'cytoscape';
import debounce from 'lodash/debounce';
import { useEffect } from 'react';
import { EuiTheme, useUiTracker } from '../../../../../observability/public';
import { getAnimationOptions, getNodeHeight } from './cytoscapeOptions';

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
  return {
    ...getAnimationOptions(theme),
    fit,
    name: 'dagre',
    animate: !fit,
    padding: nodeHeight,
    spacingFactor: 1.2,
    // @ts-ignore
    nodeSep: nodeHeight,
    edgeSep: 32,
    rankSep: 128,
    rankDir: 'LR',
    ranker: 'network-simplex',
  };
}

export function useCytoscapeEventHandlers({
  cy,
  elements,
  serviceName,
  theme,
}: {
  cy?: cytoscape.Core;
  elements: cytoscape.ElementDefinition[];
  serviceName?: string;
  theme: EuiTheme;
}) {
  const trackApmEvent = useUiTracker({ app: 'apm' });

  useEffect(() => {
    const nodeHeight = getNodeHeight(theme);

    const resetConnectedEdgeStyle = (node?: cytoscape.NodeSingular) => {
      if (cy) {
        cy.edges().removeClass('highlight');

        if (node) {
          node.connectedEdges().addClass('highlight');
        }
      }
    };

    const dataHandler: cytoscape.EventHandler = (event, fit) => {
      if (cy && cy.elements().length > 0) {
        if (serviceName) {
          resetConnectedEdgeStyle(cy.getElementById(serviceName));
          // Add the "primary" class to the node if its id matches the serviceName.
          if (cy.nodes().length > 0) {
            cy.nodes().removeClass('primary');
            cy.getElementById(serviceName).addClass('primary');
          }
        } else {
          resetConnectedEdgeStyle();
        }

        // Run the layout on nodes that are not selected and have not been manually
        // positioned.
        cy.elements('[!hasBeenDragged]')
          .difference('node:selected')
          .layout(getLayoutOptions({ fit, nodeHeight, theme }))
          .run();
      }
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
      trackNodeEdgeHover();
      event.target.addClass('hover');
      event.target.connectedEdges().addClass('nodeHover');
    };
    const mouseoutHandler: cytoscape.EventHandler = (event) => {
      event.target.removeClass('hover');
      event.target.connectedEdges().removeClass('nodeHover');
    };
    const selectHandler: cytoscape.EventHandler = (event) => {
      trackApmEvent({ metric: 'service_map_node_select' });
      resetConnectedEdgeStyle(event.target);
    };
    const unselectHandler: cytoscape.EventHandler = (event) => {
      resetConnectedEdgeStyle(
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
    const firstDragHandler: cytoscape.EventHandler = (event) => {
      event.target.data('hasBeenDragged', true);
    };
    const dragHandler: cytoscape.EventHandler = (event) => {
      applyCubicBezierStyles(event.target.connectedEdges());
    };

    if (cy) {
      cy.on('custom:data layoutstop select unselect', debugHandler);
      cy.on('custom:data', dataHandler);
      cy.on('layoutstop', layoutstopHandler);
      cy.on('mouseover', 'edge, node', mouseoverHandler);
      cy.on('mouseout', 'edge, node', mouseoutHandler);
      cy.on('select', 'node', selectHandler);
      cy.on('unselect', 'node', unselectHandler);
      cy.one('drag', 'node', firstDragHandler);
      cy.on('drag', 'node', dragHandler);

      // We do a fit if we're going from 0 to >0 elements
      const fit = cy.elements().length === 0 && elements.length > 0;

      // Remove any old elements that don't exist in the new set of elements.
      const elementIds = elements.map((element) => element.data.id);
      cy.elements().forEach((element) => {
        if (!elementIds.includes(element.data('id'))) {
          cy.remove(element);
        }
      });
      cy.add(elements);
      cy.trigger('custom:data', [fit]);
    }

    return () => {
      if (cy) {
        cy.removeListener(
          'data layoutstop select unselect',
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
        cy.removeListener('drag', 'node', firstDragHandler);
      }
    };
  }, [cy, elements, serviceName, trackApmEvent, theme]);
}
