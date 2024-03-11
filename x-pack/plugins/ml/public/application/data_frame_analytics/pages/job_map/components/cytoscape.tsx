/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CSSProperties, ReactNode } from 'react';
import React, { useState, useRef, useEffect, createContext, useCallback, useMemo } from 'react';
import { css } from '@emotion/react';
import cytoscape, { type Stylesheet } from 'cytoscape';
// @ts-ignore no declaration file
import dagre from 'cytoscape-dagre';
import { getCytoscapeOptions } from './cytoscape_options';
import type { EuiThemeType } from '../../../../components/color_range_legend';

cytoscape.use(dagre);

export const CytoscapeContext = createContext<cytoscape.Core | undefined>(undefined);

interface CytoscapeProps {
  children?: ReactNode;
  elements: cytoscape.ElementDefinition[];
  theme: EuiThemeType;
  height: number;
  itemsDeleted: boolean;
  resetCy: boolean;
  style?: CSSProperties;
  width: number;
}

function useCytoscape(options: cytoscape.CytoscapeOptions) {
  const [cy, setCy] = useState<cytoscape.Core | undefined>();
  const ref = useRef(null);

  useEffect(() => {
    if (!cy) {
      setCy(cytoscape({ ...options, container: ref.current }));
    } else {
      // update styles for existing instance
      cy.style(options.style as unknown as Stylesheet);
    }
  }, [options, cy]);

  // Destroy the cytoscape instance on unmount
  useEffect(
    function destroyOnUnmount() {
      return () => {
        if (cy) {
          cy.destroy();
        }
      };
    },
    [cy]
  );

  return [ref, cy] as [React.MutableRefObject<any>, cytoscape.Core | undefined];
}

function getLayoutOptions(width: number, height: number) {
  return {
    name: 'dagre',
    rankDir: 'LR',
    fit: true,
    padding: 20,
    spacingFactor: 0.95,
    boundingBox: { x1: 0, y1: 0, w: width, h: height },
  };
}

export function Cytoscape({
  children,
  elements,
  theme,
  height,
  itemsDeleted,
  resetCy,
  style,
  width,
}: CytoscapeProps) {
  const cytoscapeOptions = useMemo(() => {
    return {
      ...getCytoscapeOptions(theme),
      elements,
    };
  }, [theme, elements]);

  const [ref, cy] = useCytoscape(cytoscapeOptions);

  // Add the height to the div style. The height is a separate prop because it
  // is required and can trigger rendering when changed.
  const divStyle = useMemo(() => {
    return { ...style, height, width };
  }, [style, height, width]);

  const dataHandler = useCallback<cytoscape.EventHandler>(
    (event) => {
      if (cy && height > 0) {
        // temporary workaround for single 'row' maps showing up outside of the graph bounds
        setTimeout(() => cy.layout(getLayoutOptions(width, height)).run(), 150);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cy, elements, height, width]);

  // Trigger a custom "data" event when data changes
  useEffect(() => {
    if (cy) {
      if (itemsDeleted === false) {
        cy.add(elements);
      } else {
        cy.elements().remove();
        cy.add(elements);
      }

      cy.trigger('data');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cy, elements]);

  // Reset the graph to original zoom and pan
  useEffect(() => {
    if (cy) {
      cy.reset();
      // Refitting because it's possible the the width/height have changed
      cy.fit();
    }
  }, [cy, resetCy, width, height]);

  return (
    <CytoscapeContext.Provider value={cy}>
      <div
        ref={ref}
        css={css`
          ${divStyle}
        `}
        data-test-subj="mlPageDataFrameAnalyticsMapCytoscape"
      >
        {children}
      </div>
    </CytoscapeContext.Provider>
  );
}
