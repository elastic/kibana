/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, {
  CSSProperties,
  useState,
  useRef,
  useEffect,
  ReactNode,
  createContext,
  useCallback,
} from 'react';
import cytoscape from 'cytoscape';
import dagre from 'cytoscape-dagre';
import { cytoscapeOptions } from './cytoscape_options';

cytoscape.use(dagre);

export const CytoscapeContext = createContext<cytoscape.Core | undefined>(undefined);

interface CytoscapeProps {
  children?: ReactNode;
  elements: cytoscape.ElementDefinition[];
  height: number;
  style?: CSSProperties;
  width: number;
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

function getLayoutOptions(width: number, height: number) {
  return {
    name: 'dagre',
    rankDir: 'LR',
    fit: true,
    spacingFactor: 0.85,
    boundingBox: { x1: 0, y1: 0, w: width, h: height },
  };
}

export function Cytoscape({ children, elements, height, style, width }: CytoscapeProps) {
  const [ref, cy] = useCytoscape({
    ...cytoscapeOptions,
    elements,
  });

  // Add the height to the div style. The height is a separate prop because it
  // is required and can trigger rendering when changed.
  const divStyle = { ...style, height };

  const dataHandler = useCallback<cytoscape.EventHandler>(
    (event) => {
      if (cy) {
        const layout = cy.layout(getLayoutOptions(width, height));
        layout.run();
      }
    },
    [cy, height, width]
  );

  // Set up cytoscape event handlers
  useEffect(() => {
    if (cy) {
      cy.on('data', dataHandler);
    }

    return () => {
      if (cy) {
        cy.removeListener('data', undefined, dataHandler as cytoscape.EventHandler);
      }
    };
  }, [cy, elements, height, width]);

  // Trigger a custom "data" event when data changes
  useEffect(() => {
    if (cy) {
      cy.add(elements);
      cy.trigger('data');
    }
  }, [cy, elements]);

  return (
    <CytoscapeContext.Provider value={cy}>
      <div ref={ref} style={divStyle}>
        {children}
      </div>
    </CytoscapeContext.Provider>
  );
}
