/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import cytoscape from 'cytoscape';
import dblclick from 'cytoscape-dblclick';
// @ts-expect-error
import expandCollapse from 'cytoscape-expand-collapse';
// @ts-expect-error
import fcose from 'cytoscape-fcose';
import React, { createContext, useEffect, useRef, useState } from 'react';

export const CytoscapeContext = createContext<cytoscape.Core | undefined>(undefined);

export function getLayoutOptions({ fit, randomize }: { fit?: boolean; randomize?: boolean } = {}) {
  return {
    name: 'fcose',
    animate: true,
    randomize: Boolean(randomize),
    fit: fit == null || fit,
    nodeDimensionsIncludeLabels: true,
    packComponents: true,
  };
}

cytoscape.use(dblclick);
cytoscape.use(expandCollapse);
cytoscape.use(fcose);

export function useCytoscape(options: cytoscape.CytoscapeOptions) {
  const [cy, setCy] = useState<cytoscape.Core | undefined>(undefined);
  const ref = useRef(null);

  useEffect(() => {
    if (!cy) {
      const instance = cytoscape({ ...options, container: ref.current });
      instance.dblclick();
      // @ts-expect-error
      instance.expandCollapse({
        layoutBy: getLayoutOptions({ fit: false }),
        fisheye: false,
        animate: true,
        undoable: false,
        cueEnabled: false,
        groupEdgesOfSameTypeOnCollapse: false,
      });
      setCy(instance);
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
