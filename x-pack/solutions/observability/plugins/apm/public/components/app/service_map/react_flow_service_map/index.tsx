/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLoadingSpinner, EuiText, EuiPanel, EuiEmptyPrompt } from '@elastic/eui';
import type cytoscape from 'cytoscape';
import { FETCH_STATUS } from '../../../../hooks/use_fetcher';

interface ReactFlowServiceMapProps {
  elements: cytoscape.ElementDefinition[];
  height: number;
  serviceName?: string;
  status: FETCH_STATUS;
}

/**
 * React Flow Service Map Component (Placeholder)
 * This is a placeholder while we resolve the bundling issues with @xyflow/react
 */
export function ReactFlowServiceMap({ elements, height, status }: ReactFlowServiceMapProps) {
  const nodeCount = elements.filter((el) => !('source' in (el.data || {}))).length;
  const edgeCount = elements.filter((el) => 'source' in (el.data || {})).length;

  return (
    <EuiPanel
      style={{
        height,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {status === FETCH_STATUS.LOADING ? (
        <EuiLoadingSpinner size="xl" />
      ) : (
        <EuiEmptyPrompt
          iconType="visVega"
          title={<h2>React Flow Service Map POC</h2>}
          body={
            <>
              <EuiText>
                <p>
                  This is a placeholder for the React Flow implementation.
                  <br />
                  The data is being loaded successfully:
                </p>
                <ul>
                  <li>
                    <strong>Nodes:</strong> {nodeCount}
                  </li>
                  <li>
                    <strong>Edges:</strong> {edgeCount}
                  </li>
                </ul>
              </EuiText>
            </>
          }
        />
      )}
    </EuiPanel>
  );
}
