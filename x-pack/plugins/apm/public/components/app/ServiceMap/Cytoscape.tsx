/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, {
  createContext,
  CSSProperties,
  ReactNode,
  useEffect,
  useRef,
  useState,
} from 'react';
import cytoscape from 'cytoscape';
import dagre from 'cytoscape-dagre';
import { debounce } from 'lodash';
import { useTheme } from '../../../hooks/useTheme';
import {
  getAnimationOptions,
  getCytoscapeOptions,
  getNodeHeight,
} from './cytoscapeOptions';
import { useUiTracker } from '../../../../../observability/public';

cytoscape.use(dagre);

export const CytoscapeContext = createContext<cytoscape.Core | undefined>(
  undefined
);

interface CytoscapeProps {
  children?: ReactNode;
  elements: cytoscape.ElementDefinition[];
  height: number;
  serviceName?: string;
  style?: CSSProperties;
}

function useCytoscape(options: cytoscape.CytoscapeOptions) {
  const [cy, setCy] = useState<cytoscape.Core | undefined>(undefined);
  const ref = useRef(null);

  useEffect(() => {
    if (!cy) {
      setCy(cytoscape({ ...options, container: ref.current }));
    }
  }, [options, cy]);

  // Destroy the cytoscape instance on unmount
  useEffect(() => {
    return () => {
      if (cy) {
        cy.destroy();
      }
    };
  }, [cy]);

  return [ref, cy] as [React.MutableRefObject<any>, cytoscape.Core | undefined];
}

function getLayoutOptions(nodeHeight: number): cytoscape.LayoutOptions {
  return {
    name: 'dagre',
    fit: true,
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

export function Cytoscape({
  children,
  elements,
  height,
  serviceName,
  style,
}: CytoscapeProps) {
  const theme = useTheme();
  const [ref, cy] = useCytoscape({
    ...getCytoscapeOptions(theme),
    elements,
  });

  const nodeHeight = getNodeHeight(theme);

  // Add the height to the div style. The height is a separate prop because it
  // is required and can trigger rendering when changed.
  const divStyle = { ...style, height };

  const trackApmEvent = useUiTracker({ app: 'apm' });

  // Set up cytoscape event handlers
  useEffect(() => {
    const resetConnectedEdgeStyle = (node?: cytoscape.NodeSingular) => {
      if (cy) {
        cy.edges().removeClass('highlight');

        if (node) {
          node.connectedEdges().addClass('highlight');
        }
      }
    };

    const dataHandler: cytoscape.EventHandler = (event) => {
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
        cy.layout(getLayoutOptions(nodeHeight)).run();
      }
    };
    let layoutstopDelayTimeout: NodeJS.Timeout;
    const layoutstopHandler: cytoscape.EventHandler = (event) => {
      // This 0ms timer is necessary to prevent a race condition
      // between the layout finishing rendering and viewport centering
      layoutstopDelayTimeout = setTimeout(() => {
        if (serviceName) {
          event.cy.animate({
            ...getAnimationOptions(theme),
            fit: {
              eles: event.cy.elements(),
              padding: nodeHeight,
            },
            center: {
              eles: event.cy.getElementById(serviceName),
            },
          });
        } else {
          event.cy.fit(undefined, nodeHeight);
        }
      }, 0);
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
    const dragHandler: cytoscape.EventHandler = (event) => {
      applyCubicBezierStyles(event.target.connectedEdges());
    };

    if (cy) {
      cy.on('data layoutstop select unselect', debugHandler);
      cy.on('data', dataHandler);
      cy.on('layoutstop', layoutstopHandler);
      cy.on('mouseover', 'edge, node', mouseoverHandler);
      cy.on('mouseout', 'edge, node', mouseoutHandler);
      cy.on('select', 'node', selectHandler);
      cy.on('unselect', 'node', unselectHandler);
      cy.on('drag', 'node', dragHandler);

      cy.remove(cy.elements());
      cy.add(elements);
      cy.trigger('data');
    }

    return () => {
      if (cy) {
        cy.removeListener(
          'data layoutstop select unselect',
          undefined,
          debugHandler
        );
        cy.removeListener('data', undefined, dataHandler);
        cy.removeListener('layoutstop', undefined, layoutstopHandler);
        cy.removeListener('mouseover', 'edge, node', mouseoverHandler);
        cy.removeListener('mouseout', 'edge, node', mouseoutHandler);
        cy.removeListener('select', 'node', selectHandler);
        cy.removeListener('unselect', 'node', unselectHandler);
        cy.removeListener('drag', 'node', dragHandler);
      }
      clearTimeout(layoutstopDelayTimeout);
    };
  }, [cy, elements, height, serviceName, trackApmEvent, nodeHeight, theme]);

  return (
    <CytoscapeContext.Provider value={cy}>
      <div ref={ref} style={divStyle}>
        {children}
      </div>
    </CytoscapeContext.Provider>
  );
}
