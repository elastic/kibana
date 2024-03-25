/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type cytoscape from 'cytoscape';
import { useEffect } from 'react';
import type { EuiTheme } from '@kbn/kibana-react-plugin/common';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { i18n } from '@kbn/i18n';
import {
  DocumentDetailsPreviewPanelKey,
  type PreviewPanelProps,
  RulePreviewPanel,
} from '../../../preview';

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
    edge.style('control-point-distances', [-alpha * y * costheta, alpha * y * costheta]);
    edge.style('control-point-weights', [alpha, 1 - alpha]);
  });
}

// function getLayoutOptions({
//   fit = false,
//   nodeHeight,
//   theme,
// }: {
//   fit?: boolean;
//   nodeHeight: number;
//   theme: EuiTheme;
// }): cytoscape.LayoutOptions {
//   const animationOptions = getAnimationOptions(theme);

//   // @ts-expect-error Some of the dagre-specific layout options don't work with
//   // the types.
//   return {
//     animationDuration: animationOptions.duration,
//     animationEasing: animationOptions.easing,
//     fit,
//     name: 'dagre',
//     animate: !fit,
//     padding: nodeHeight,
//     spacingFactor: 1.2,
//     nodeSep: nodeHeight,
//     edgeSep: 32,
//     rankSep: 128,
//     rankDir: 'LR',
//     ranker: 'network-simplex',
//   };
// }

function setCursor(cursor: string, event: cytoscape.EventObjectCore) {
  const container = event.cy.container();

  if (container) {
    container.style.cursor = cursor;
  }
}

function resetConnectedEdgeStyle(cytoscapeInstance: cytoscape.Core, node?: cytoscape.NodeSingular) {
  cytoscapeInstance.edges().removeClass('highlight');
  if (node) {
    node.connectedEdges().addClass('highlight');
  }
}

export function useCytoscapeEventHandlers({
  cy,
  theme,
  layout,
}: {
  cy?: cytoscape.Core;
  theme: EuiTheme;
  layout: cytoscape.LayoutOptions;
}) {
  // const trackApmEvent = useUiTracker({ app: 'apm' });
  const { openPreviewPanel } = useExpandableFlyoutApi();

  useEffect(() => {
    // const nodeHeight = getNodeHeight(theme);

    const dataHandler: cytoscape.EventHandler = (event) => {
      resetConnectedEdgeStyle(event.cy);

      // Run the layout on nodes that are not selected and have not been manually
      // positioned.
      event.cy.elements('[!hasBeenDragged]').difference('node:selected').layout(layout).run();
    };

    const layoutstopHandler: cytoscape.EventHandler = (event) => {
      applyCubicBezierStyles(event.cy.edges());
    };

    // // debounce hover tracking so it doesn't spam telemetry with redundant events
    // const trackNodeEdgeHover = debounce(
    //   () => trackApmEvent({ metric: 'service_map_node_or_edge_hover' }),
    //   1000
    // );

    const mouseoverHandler: cytoscape.EventHandler = (event) => {
      if (event.target.isNode()) {
        setCursor('pointer', event);
      }

      // trackNodeEdgeHover();
      event.target.addClass('hover');
      event.target.connectedEdges().addClass('nodeHover');
    };
    const mouseoutHandler: cytoscape.EventHandler = (event) => {
      setCursor('grab', event);

      event.target.removeClass('hover');
      event.target.connectedEdges().removeClass('nodeHover');
    };
    const selectHandler: cytoscape.EventHandler = (event) => {
      resetConnectedEdgeStyle(event.cy, event.target);
    };
    const unselectHandler: cytoscape.EventHandler = (event) => {
      resetConnectedEdgeStyle(event.cy);
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

    /**
     * Alert / Event graph related handlers
     */
    const selectAlertHandler: cytoscape.EventHandler = (event) => {
      const PreviewPanelRulePreview: PreviewPanelProps['path'] = { tab: RulePreviewPanel };
      openPreviewPanel({
        id: DocumentDetailsPreviewPanelKey,
        path: PreviewPanelRulePreview,
        params: {
          id: event.target.data('eventId'),
          indexName: event.target.data('indexName'),
          scopeId: event.target.data('scopeId'),
          banner: {
            title: i18n.translate(
              'xpack.securitySolution.flyout.right.about.description.rulePreviewTitle',
              { defaultMessage: 'Preview rule details' }
            ),
            backgroundColor: 'warning',
            textColor: 'warning',
          },
          ruleId: event.target.data('ruleId'),
        },
      });
    };

    if (cy) {
      cy.on('custom:data drag dragfree layoutstop select tapstart tapend unselect', debugHandler);
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
      cy.on('select', 'node.alert-node', selectAlertHandler);
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
        cy.removeListener('select', 'node.alert-node', selectAlertHandler);
      }
    };
  }, [cy, theme, openPreviewPanel, layout]);
}
