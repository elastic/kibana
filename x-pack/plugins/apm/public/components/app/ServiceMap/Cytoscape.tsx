/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import cytoscape from 'cytoscape';
import dagre from 'cytoscape-dagre';
// Prefer importing entire lodash library, e.g. import { get } from "lodash"
// eslint-disable-next-line no-restricted-imports
import isEqual from 'lodash/isEqual';
import React, {
  createContext,
  CSSProperties,
  memo,
  ReactNode,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useTheme } from '../../../hooks/useTheme';
import { getCytoscapeOptions } from './cytoscapeOptions';
import { useCytoscapeEventHandlers } from './use_cytoscape_event_handlers';

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

function CytoscapeComponent({
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
  useCytoscapeEventHandlers({ cy, serviceName, theme });

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

export const Cytoscape = memo(CytoscapeComponent, (prevProps, nextProps) => {
  const prevElementIds = prevProps.elements
    .map((element) => element.data.id)
    .sort();
  const nextElementIds = nextProps.elements
    .map((element) => element.data.id)
    .sort();

  const propsAreEqual =
    prevProps.height === nextProps.height &&
    prevProps.serviceName === nextProps.serviceName &&
    isEqual(prevProps.style, nextProps.style) &&
    isEqual(prevElementIds, nextElementIds);

  return propsAreEqual;
});
