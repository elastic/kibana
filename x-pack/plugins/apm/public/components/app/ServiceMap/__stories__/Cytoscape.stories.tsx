/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiCard, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { storiesOf } from '@storybook/react';
import cytoscape from 'cytoscape';
import React from 'react';
import { Cytoscape } from '../Cytoscape';
import { iconForNode } from '../icons';
import { EuiThemeProvider } from '../../../../../../observability/public';

storiesOf('app/ServiceMap/Cytoscape', module)
  .addDecorator((storyFn) => <EuiThemeProvider>{storyFn()}</EuiThemeProvider>)
  .add(
    'example',
    () => {
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
      const height = 300;
      const width = 1340;
      const serviceName = 'opbeans-python';
      return (
        <Cytoscape
          elements={elements}
          height={height}
          width={width}
          serviceName={serviceName}
        />
      );
    },
    {
      info: {
        propTables: false,
        source: false,
      },
    }
  );

storiesOf('app/ServiceMap/Cytoscape', module).add(
  'node icons',
  () => {
    const cy = cytoscape();
    const elements = [
      { data: { id: 'default' } },
      {
        data: {
          id: 'aws',
          'span.type': 'aws',
          'span.subtype': 'servicename',
        },
      },
      { data: { id: 'cache', 'span.type': 'cache' } },
      { data: { id: 'database', 'span.type': 'db' } },
      {
        data: {
          id: 'cassandra',
          'span.type': 'db',
          'span.subtype': 'cassandra',
        },
      },
      {
        data: {
          id: 'elasticsearch',
          'span.type': 'db',
          'span.subtype': 'elasticsearch',
        },
      },
      {
        data: {
          id: 'mongodb',
          'span.type': 'db',
          'span.subtype': 'mongodb',
        },
      },
      {
        data: {
          id: 'mysql',
          'span.type': 'db',
          'span.subtype': 'mysql',
        },
      },
      {
        data: {
          id: 'postgresql',
          'span.type': 'db',
          'span.subtype': 'postgresql',
        },
      },
      {
        data: {
          id: 'redis',
          'span.type': 'db',
          'span.subtype': 'redis',
        },
      },
      { data: { id: 'external', 'span.type': 'external' } },
      { data: { id: 'ext', 'span.type': 'ext' } },
      {
        data: {
          id: 'graphql',
          'span.type': 'external',
          'span.subtype': 'graphql',
        },
      },
      {
        data: {
          id: 'grpc',
          'span.type': 'external',
          'span.subtype': 'grpc',
        },
      },
      {
        data: {
          id: 'websocket',
          'span.type': 'external',
          'span.subtype': 'websocket',
        },
      },
      { data: { id: 'messaging', 'span.type': 'messaging' } },
      {
        data: {
          id: 'jms',
          'span.type': 'messaging',
          'span.subtype': 'jms',
        },
      },
      {
        data: {
          id: 'kafka',
          'span.type': 'messaging',
          'span.subtype': 'kafka',
        },
      },
      { data: { id: 'template', 'span.type': 'template' } },
      {
        data: {
          id: 'handlebars',
          'span.type': 'template',
          'span.subtype': 'handlebars',
        },
      },
      {
        data: {
          id: 'dark',
          'service.name': 'dark service',
          'agent.name': 'dark',
        },
      },
      {
        data: {
          id: 'dotnet',
          'service.name': 'dotnet service',
          'agent.name': 'dotnet',
        },
      },
      {
        data: {
          id: 'dotNet',
          'service.name': 'dotNet service',
          'agent.name': 'dotNet',
        },
      },
      {
        data: {
          id: 'go',
          'service.name': 'go service',
          'agent.name': 'go',
        },
      },
      {
        data: {
          id: 'java',
          'service.name': 'java service',
          'agent.name': 'java',
        },
      },
      {
        data: {
          id: 'RUM (js-base)',
          'service.name': 'RUM service',
          'agent.name': 'js-base',
        },
      },
      {
        data: {
          id: 'RUM (rum-js)',
          'service.name': 'RUM service',
          'agent.name': 'rum-js',
        },
      },
      {
        data: {
          id: 'nodejs',
          'service.name': 'nodejs service',
          'agent.name': 'nodejs',
        },
      },
      {
        data: {
          id: 'php',
          'service.name': 'php service',
          'agent.name': 'php',
        },
      },
      {
        data: {
          id: 'python',
          'service.name': 'python service',
          'agent.name': 'python',
        },
      },
      {
        data: {
          id: 'ruby',
          'service.name': 'ruby service',
          'agent.name': 'ruby',
        },
      },
    ];
    cy.add(elements);

    return (
      <EuiFlexGroup gutterSize="l" wrap={true}>
        {cy.nodes().map((node) => (
          <EuiFlexItem key={node.data('id')}>
            <EuiCard
              description={
                <code style={{ textAlign: 'left', whiteSpace: 'nowrap' }}>
                  agent.name: {node.data('agent.name') || 'undefined'}
                  <br />
                  span.type: {node.data('span.type') || 'undefined'}
                  <br />
                  span.subtype: {node.data('span.subtype') || 'undefined'}
                </code>
              }
              icon={
                <img
                  alt={node.data('label')}
                  src={iconForNode(node)}
                  height={80}
                  width={80}
                />
              }
              title={node.data('id')}
            />
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    );
  },
  {
    info: {
      propTables: false,
      source: false,
    },
  }
);

storiesOf('app/ServiceMap/Cytoscape', module).add(
  'node severity',
  () => {
    const elements = [
      { data: { id: 'undefined', 'service.name': 'severity: undefined' } },
      {
        data: {
          id: 'warning',
          'service.name': 'severity: warning',
          severity: 'warning',
        },
      },
      {
        data: {
          id: 'minor',
          'service.name': 'severity: minor',
          severity: 'minor',
        },
      },
      {
        data: {
          id: 'major',
          'service.name': 'severity: major',
          severity: 'major',
        },
      },
      {
        data: {
          id: 'critical',
          'service.name': 'severity: critical',
          severity: 'critical',
        },
      },
    ];
    return <Cytoscape elements={elements} height={600} width={1340} />;
  },
  {
    info: { propTables: false, source: false },
  }
);
