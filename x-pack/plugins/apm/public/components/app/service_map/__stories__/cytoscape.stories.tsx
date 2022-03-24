/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import cytoscape from 'cytoscape';
import React from 'react';
import { Cytoscape } from '../cytoscape';
import { Centerer } from './centerer';

export default {
  title: 'app/ServiceMap/cytoscape',
  component: Cytoscape,
};

export function Example() {
  const elements: cytoscape.ElementDefinition[] = [
    {
      data: {
        id: 'opbeans-python',
        'service.name': 'opbeans-python',
        'agent.name': 'python',
      },
    },
    {
      data: {
        id: 'opbeans-node',
        'service.name': 'opbeans-node',
        'agent.name': 'nodejs',
      },
    },
    {
      data: {
        id: 'opbeans-ruby',
        'service.name': 'opbeans-ruby',
        'agent.name': 'ruby',
      },
    },
    { data: { source: 'opbeans-python', target: 'opbeans-node' } },
    {
      data: {
        bidirectional: true,
        source: 'opbeans-python',
        target: 'opbeans-ruby',
      },
    },
  ];
  const serviceName = 'opbeans-python';

  return (
    <Cytoscape
      elements={elements}
      height={window.innerHeight}
      serviceName={serviceName}
    >
      <Centerer />
    </Cytoscape>
  );
}

export function NodeHealthStatus() {
  const elements = [
    {
      data: {
        id: 'undefined',
        'service.name': 'undefined',
        serviceAnomalyStats: { healthStatus: undefined },
      },
    },
    {
      data: {
        id: 'healthy',
        'service.name': 'healthy',
        serviceAnomalyStats: { healthStatus: 'healthy' },
      },
    },
    {
      data: {
        id: 'warning',
        'service.name': 'warning',
        serviceAnomalyStats: { healthStatus: 'warning' },
      },
    },
    {
      data: {
        id: 'critical',
        'service.name': 'critical',
        serviceAnomalyStats: { healthStatus: 'critical' },
      },
    },
  ];
  return (
    <Cytoscape elements={elements} height={window.innerHeight}>
      <Centerer />
    </Cytoscape>
  );
}
