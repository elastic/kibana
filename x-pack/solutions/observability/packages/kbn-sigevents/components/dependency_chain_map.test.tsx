/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { DependencyChainMap } from './dependency_chain_map';

jest.mock('@xyflow/react', () => {
  const actual = jest.requireActual('@xyflow/react');
  return {
    ...actual,
    ReactFlow: ({ nodes, edges }: { nodes: unknown[]; edges: unknown[] }) => (
      <div data-test-subj="reactFlow" data-nodes={nodes.length} data-edges={edges.length} />
    ),
    ReactFlowProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  };
});

jest.mock('@dagrejs/dagre', () => {
  const actual = jest.requireActual('@dagrejs/dagre');
  return {
    __esModule: true,
    default: {
      ...actual,
      graphlib: actual.graphlib,
      layout: jest.fn(actual.layout),
    },
  };
});

import Dagre from '@dagrejs/dagre';

const renderWithIntl = (ui: React.ReactElement) => render(<I18nProvider>{ui}</I18nProvider>);

describe('DependencyChainMap', () => {
  const defaultEdges = [
    { source: 'checkout', target: 'payment', protocol: 'grpc', exposure: 'exposed' as const },
    {
      source: 'payment',
      target: 'upstream',
      protocol: 'tcp',
      exposure: 'not_exposed' as const,
    },
  ];

  const defaultCauseKis = [{ name: 'payment', streamName: 'logs.otel' }];

  it('renders the map container with correct test subject', () => {
    const { container } = renderWithIntl(
      <DependencyChainMap dependencyEdges={defaultEdges} causeKis={defaultCauseKis} />
    );
    expect(
      container.querySelector('[data-test-subj="sigeventsDependencyChainMap"]')
    ).toBeInTheDocument();
  });

  it('creates nodes for all unique services in edges', () => {
    const { container } = renderWithIntl(
      <DependencyChainMap dependencyEdges={defaultEdges} causeKis={defaultCauseKis} />
    );
    const reactFlow = container.querySelector('[data-test-subj="reactFlow"]');
    expect(reactFlow).toHaveAttribute('data-nodes', '3');
  });

  it('creates edges for each dependency edge', () => {
    const { container } = renderWithIntl(
      <DependencyChainMap dependencyEdges={defaultEdges} causeKis={defaultCauseKis} />
    );
    const reactFlow = container.querySelector('[data-test-subj="reactFlow"]');
    expect(reactFlow).toHaveAttribute('data-edges', '2');
  });

  it('adds cause nodes not present in edges', () => {
    const causeKis = [{ name: 'external-gateway', streamName: 'logs.otel' }];
    const { container } = renderWithIntl(
      <DependencyChainMap dependencyEdges={defaultEdges} causeKis={causeKis} />
    );
    const reactFlow = container.querySelector('[data-test-subj="reactFlow"]');
    // 3 from edges + 1 cause node not in edges
    expect(reactFlow).toHaveAttribute('data-nodes', '4');
  });

  it('merges cause_ki with edge node when names match fuzzily (e.g. payment vs payment-service)', () => {
    const causeKis = [{ name: 'payment-service', streamName: 'logs.otel' }];
    const { container } = renderWithIntl(
      <DependencyChainMap dependencyEdges={defaultEdges} causeKis={causeKis} />
    );
    const reactFlow = container.querySelector('[data-test-subj="reactFlow"]');
    // Should still be 3 nodes (checkout, payment, upstream) — not 4
    expect(reactFlow).toHaveAttribute('data-nodes', '3');
  });

  it('returns null when there are no nodes', () => {
    const { container } = renderWithIntl(<DependencyChainMap dependencyEdges={[]} causeKis={[]} />);
    expect(
      container.querySelector('[data-test-subj="sigeventsDependencyChainMap"]')
    ).not.toBeInTheDocument();
  });

  it('falls back to grid layout when Dagre.layout throws', () => {
    (Dagre.layout as jest.Mock).mockImplementationOnce(() => {
      throw new Error('Layout failed');
    });

    const { container } = renderWithIntl(
      <DependencyChainMap dependencyEdges={defaultEdges} causeKis={defaultCauseKis} />
    );
    const reactFlow = container.querySelector('[data-test-subj="reactFlow"]');
    // Still renders nodes even with the fallback
    expect(reactFlow).toHaveAttribute('data-nodes', '3');
  });
});
