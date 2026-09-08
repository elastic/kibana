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

const mockUseLicenseContext = jest.fn();
jest.mock('../../context/license/use_license_context', () => ({
  useLicenseContext: () => mockUseLicenseContext(),
}));

const mockUseApmPluginContext = jest.fn();
jest.mock('../../context/apm_plugin/use_apm_plugin_context', () => ({
  useApmPluginContext: () => mockUseApmPluginContext(),
}));

const platinumLicense = { isActive: true, hasAtLeast: () => true };
const basicLicense = { isActive: true, hasAtLeast: () => false };

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
    mockUseLicenseContext.mockReturnValue(platinumLicense);
    mockUseApmPluginContext.mockReturnValue({ config: { serviceMapEnabled: true } });
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
    // Datemath is resolved to concrete ISO timestamps for the graph fetches.
    expect(Date.parse(lastGraphProps!.start)).not.toBeNaN();
    expect(Date.parse(lastGraphProps!.end)).not.toBeNaN();
  });

  it('falls back to the default range when timeRange is unparseable', () => {
    render(
      <AgentContextualServiceMap
        data={{
          connections,
          serviceName: 'backend',
          timeRange: { start: 'not-a-date', end: 'also-not-a-date' },
        }}
        deps={deps}
      />
    );

    expect(lastEmbeddableContextProps).toMatchObject({ rangeFrom: 'now-1h', rangeTo: 'now' });
    expect(Date.parse(lastGraphProps!.start)).not.toBeNaN();
    expect(Date.parse(lastGraphProps!.end)).not.toBeNaN();
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

  it('renders the Explore in Service map link with EBT click attributes', () => {
    render(
      <AgentContextualServiceMap data={{ connections, serviceName: 'backend' }} deps={deps} />
    );

    const link = screen.getByTestId('apmAgentServiceMapExploreInServiceMap');
    expect(link).toHaveAttribute('href', 'http://localhost/app/apm/service-map');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('data-ebt-action', 'exploreServiceMap');
    expect(link).toHaveAttribute('data-ebt-element', 'serviceMapAgentAttachmentLink');
  });

  it('hides the Explore link without an active platinum license', () => {
    mockUseLicenseContext.mockReturnValue(basicLicense);

    render(
      <AgentContextualServiceMap data={{ connections, serviceName: 'backend' }} deps={deps} />
    );

    expect(screen.queryByTestId('apmAgentServiceMapExploreInServiceMap')).not.toBeInTheDocument();
    // The map itself still renders — only the full-map entry points are gated,
    // including the graph's own "View in Service map" toolbar button.
    expect(screen.getByTestId('contextualServiceMapGraph')).toBeInTheDocument();
    expect(lastGraphProps?.fullMapHref).toBeUndefined();
  });

  it('hides the Explore link when service map is disabled in config', () => {
    mockUseApmPluginContext.mockReturnValue({ config: { serviceMapEnabled: false } });

    render(
      <AgentContextualServiceMap data={{ connections, serviceName: 'backend' }} deps={deps} />
    );

    expect(screen.queryByTestId('apmAgentServiceMapExploreInServiceMap')).not.toBeInTheDocument();
    expect(screen.getByTestId('contextualServiceMapGraph')).toBeInTheDocument();
    expect(lastGraphProps?.fullMapHref).toBeUndefined();
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
