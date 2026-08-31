/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { ServiceMapAttachmentData } from '../../../common/agent_builder/attachments';
import type { ContextualServiceMapGraphProps } from '../../components/app/service_map/contextual_map/contextual_service_map_graph';
import type { EmbeddableDeps } from '../../embeddable/types';
import { AgentContextualServiceMap } from './agent_contextual_service_map';

let lastGraphProps: ContextualServiceMapGraphProps | undefined;
let lastEmbeddableContextProps: Record<string, unknown> | undefined;

jest.mock('./agent_service_map', () => ({
  AgentServiceMap: () => <div data-test-subj="staticAgentServiceMap" />,
}));

jest.mock('../../components/app/service_map/contextual_map/contextual_service_map_graph', () => ({
  ContextualServiceMapGraph: (props: ContextualServiceMapGraphProps) => {
    lastGraphProps = props;
    return <div data-test-subj="contextualServiceMapGraph" />;
  },
}));

jest.mock('../../embeddable/embeddable_context', () => ({
  ApmEmbeddableContext: ({ children, ...props }: { children: React.ReactNode }) => {
    lastEmbeddableContextProps = props;
    return <>{children}</>;
  },
}));

jest.mock('../../embeddable/service_map/get_service_map_url', () => ({
  getServiceMapUrl: jest.fn(() => 'http://localhost/app/apm/service-map'),
}));

const deps = {} as EmbeddableDeps;

const connections: ServiceMapAttachmentData['connections'] = [
  {
    source: { 'service.name': 'frontend', 'agent.name': 'nodejs' },
    target: { 'service.name': 'backend', 'agent.name': 'java' },
    metrics: { latencyMs: 150 },
  },
  {
    source: { 'service.name': 'backend', 'agent.name': 'java' },
    target: { 'span.destination.service.resource': 'postgresql', 'span.type': 'db' },
  },
];

describe('AgentContextualServiceMap', () => {
  beforeEach(() => {
    lastGraphProps = undefined;
    lastEmbeddableContextProps = undefined;
  });

  it('renders the contextual map focused on data.serviceName', () => {
    render(
      <AgentContextualServiceMap
        data={{
          connections,
          serviceName: 'backend',
          timeRange: { start: 'now-15m', end: 'now' },
          environment: 'production',
        }}
        deps={deps}
      />
    );

    expect(screen.getByTestId('contextualServiceMapGraph')).toBeInTheDocument();
    expect(screen.queryByTestId('staticAgentServiceMap')).not.toBeInTheDocument();
    expect(lastGraphProps).toMatchObject({
      focalServiceId: 'backend',
      environment: 'production',
      fullMapHref: 'http://localhost/app/apm/service-map',
      showContextControls: true,
    });
    expect(lastGraphProps?.nodes.map((node) => node.id).sort()).toEqual([
      '>postgresql',
      'backend',
      'frontend',
    ]);
    expect(lastEmbeddableContextProps).toMatchObject({
      rangeFrom: 'now-15m',
      rangeTo: 'now',
      environment: 'production',
    });
  });

  it('falls back to the tool default time range and environment', () => {
    render(
      <AgentContextualServiceMap data={{ connections, serviceName: 'backend' }} deps={deps} />
    );

    expect(lastEmbeddableContextProps).toMatchObject({
      rangeFrom: 'now-1h',
      rangeTo: 'now',
      environment: 'ENVIRONMENT_ALL',
    });
  });

  it('hides in-graph context controls in the sidebar', () => {
    render(
      <AgentContextualServiceMap
        data={{ connections, serviceName: 'backend' }}
        deps={deps}
        isSidebar
      />
    );

    expect(lastGraphProps?.showContextControls).toBe(false);
  });

  it('falls back to the static map when serviceName is missing', () => {
    render(<AgentContextualServiceMap data={{ connections }} deps={deps} />);

    expect(screen.getByTestId('staticAgentServiceMap')).toBeInTheDocument();
    expect(screen.queryByTestId('contextualServiceMapGraph')).not.toBeInTheDocument();
  });

  it('falls back to the static map when serviceName is not part of the topology', () => {
    render(
      <AgentContextualServiceMap
        data={{ connections, serviceName: 'unknown-service' }}
        deps={deps}
      />
    );

    expect(screen.getByTestId('staticAgentServiceMap')).toBeInTheDocument();
    expect(screen.queryByTestId('contextualServiceMapGraph')).not.toBeInTheDocument();
  });
});
