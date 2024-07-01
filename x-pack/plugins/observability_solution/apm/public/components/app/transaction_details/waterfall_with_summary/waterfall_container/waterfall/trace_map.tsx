/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import cytoscape from 'cytoscape';
import dagre from 'cytoscape-dagre';
import { isEqual } from 'lodash';
import React, {
  createContext,
  CSSProperties,
  memo,
  ReactNode,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useTraceExplorerEnabledSetting } from '../../../../../../hooks/use_trace_explorer_enabled_setting';
import { useTheme } from '../../../../../../hooks/use_theme';
import { getCytoscapeOptions } from '../../../../service_map/cytoscape_options';
import { useCytoscapeEventHandlers } from '../../../../service_map/use_cytoscape_event_handlers';
import { useWaterfallContext } from './context/use_waterfall';
import type { IWaterfallNode } from './waterfall_helpers/waterfall_helpers';
import { useRefDimensions } from '../../../../service_map/use_ref_dimensions';

cytoscape.use(dagre);

export const convertTreeToCytoscapeElements = (
  root: IWaterfallNode | null
): cytoscape.ElementDefinition[] => {
  if (!root) {
    return [];
  }

  const result: cytoscape.ElementDefinition[] = [];
  const stack: Array<{
    source: string | undefined;
    node: IWaterfallNode;
  }> = [{ source: root.item.doc.parent?.id, node: root }];

  while (stack.length > 0) {
    const { node, source } = stack.pop()!;

    const { children } = node;

    const label =
      node.item.docType === 'span' ? node.item.doc.span.name : node.item.doc.transaction.name;

    result.push({
      data: {
        id: node.id,
        label,
      },
    });

    if (node.expanded) {
      for (let i = children.length - 1; i >= 0; i--) {
        result.push({
          data: {
            id: `${node.id}~${children[i].id}`,
            label,
            source: node.id,
            target: children[i].id,
          },
        });

        stack.push({ node: children[i], source: node.id });
      }
    }
  }

  return result;
};

export const CytoscapeContext = createContext<cytoscape.Core | undefined>(undefined);

export interface CytoscapeProps {
  children?: ReactNode;
  elements: cytoscape.ElementDefinition[];
  height: number;
  style?: CSSProperties;
}

function useCytoscape(options: cytoscape.CytoscapeOptions) {
  const [cy, setCy] = useState<cytoscape.Core | undefined>(undefined);
  const ref = useRef(null);

  useEffect(() => {
    if (!cy) {
      setCy(
        cytoscape({
          ...options,
          container: ref.current,
        })
      );
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

function CytoscapeComponent({ children, elements, height, style }: CytoscapeProps) {
  const theme = useTheme();
  const isTraceExplorerEnabled = useTraceExplorerEnabledSetting();
  const [ref, cy] = useCytoscape({
    ...getCytoscapeOptions(theme, isTraceExplorerEnabled),
    elements,
  });
  useCytoscapeEventHandlers({ cy, serviceName: undefined, theme });

  // Add items from the elements prop to the cytoscape collection and remove
  // items that no longer are in the list, then trigger an event to notify
  // the handlers that data has changed.
  useEffect(() => {
    if (cy && elements.length > 0) {
      // We do a fit if we're going from 0 to >0 elements
      const fit = cy.elements().length === 0;

      cy.add(elements);
      // Remove any old elements that don't exist in the new set of elements.
      const elementIds = elements.map((element) => element.data.id);
      cy.elements().forEach((element) => {
        if (!elementIds.includes(element.data('id'))) {
          cy.remove(element);
        } else {
          // Doing an "add" with an element with the same id will keep the original
          // element. Set the data with the new element data.
          const newElement = elements.find((el) => el.data.id === element.id());
          element.data(newElement?.data ?? element.data());
        }
      });
      cy.trigger('custom:data', [fit]);
    }
  }, [cy, elements]);

  // Add the height to the div style. The height is a separate prop because it
  // is required and can trigger rendering when changed.
  const divStyle = { ...style, height };

  return (
    <CytoscapeContext.Provider value={cy}>
      <div ref={ref} style={divStyle}>
        {children}
      </div>
    </CytoscapeContext.Provider>
  );
}

const Cytoscape = memo(CytoscapeComponent, (prevProps, nextProps) => {
  const prevElementIds = prevProps.elements.map((element) => element.data.id).sort();
  const nextElementIds = nextProps.elements.map((element) => element.data.id).sort();

  const propsAreEqual =
    prevProps.height === nextProps.height &&
    isEqual(prevProps.style, nextProps.style) &&
    isEqual(prevElementIds, nextElementIds);

  return propsAreEqual;
});

export function TraceMap() {
  const { ref, height } = useRefDimensions();
  const [elements, setElements] = useState<cytoscape.ElementDefinition[]>([]);
  const { tree } = useWaterfallContext();
  useEffect(() => {
    setElements(convertTreeToCytoscapeElements(tree));
  }, [tree]);

  const PADDING_BOTTOM = 24;
  const heightWithPadding = height - PADDING_BOTTOM;

  return (
    <div style={{ height: heightWithPadding }} ref={ref}>
      <Cytoscape elements={elements} height={heightWithPadding} style={{}} />
    </div>
  );
}
