/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useContext, useEffect } from 'react';
import { CytoscapeContext } from '../cytoscape';

// Component to center map on load
export function Centerer() {
  const cy = useContext(CytoscapeContext);

  useEffect(() => {
    if (cy) {
      cy.one('layoutstop', (event) => {
        event.cy.animate({
          duration: 50,
          center: { eles: '' },
          fit: { eles: '', padding: 50 },
        });
      });
    }
  }, [cy]);

  return null;
}
