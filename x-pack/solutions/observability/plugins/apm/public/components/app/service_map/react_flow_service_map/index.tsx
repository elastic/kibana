/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense, lazy } from 'react';
import { EuiLoadingSpinner, EuiPanel } from '@elastic/eui';
import type { ElementDefinition } from 'cytoscape';
import type { FETCH_STATUS } from '../../../../hooks/use_fetcher';

interface ReactFlowServiceMapProps {
  elements: ElementDefinition[];
  height: number;
  serviceName?: string;
  status: FETCH_STATUS;
}

// Lazy load the React Flow component with a separate webpack chunk
const ReactFlowGraph = lazy(
  () =>
    import(
      /* webpackChunkName: "react-flow-service-map" */
      /* webpackMode: "lazy" */
      './react_flow_graph'
    )
);

/**
 * React Flow Service Map Component
 * Uses lazy loading to handle webpack bundling issues with @xyflow/react
 */
export function ReactFlowServiceMap(props: ReactFlowServiceMapProps) {
  return (
    <Suspense
      fallback={
        <EuiPanel
          style={{
            height: props.height,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <EuiLoadingSpinner size="xl" />
        </EuiPanel>
      }
    >
      <ReactFlowGraph {...props} />
    </Suspense>
  );
}
