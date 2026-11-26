/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import type { InvestigationImpactMapResponse } from '@kbn/agentic-investigations-plugin/common';
import { MOCK_EUI_THEME_FOR_USE_THEME } from '../../components/shared/service_map/test_helpers';
import { DEFAULT_EDGE_STYLE } from '../../../common/service_map/constants';
import { ImpactServiceMap } from './impact_service_map';
import {
  IMPACT_SEVERITY_SCORES,
  getImpactSeverityScore,
  getEuiIcon,
  getImpactState,
  transformImpactMap,
} from './transform_impact_map';

jest.mock('@elastic/eui', () => {
  const original = jest.requireActual('@elastic/eui');
  return {
    ...original,
    useEuiTheme: () => ({
      euiTheme: MOCK_EUI_THEME_FOR_USE_THEME,
      colorMode: 'LIGHT',
    }),
  };
});

jest.mock('@kbn/apm-ui-shared', () => ({
  getSpanIcon: jest.fn((type?: string) => (type ? 'mock-span-icon.svg' : undefined)),
}));

jest.mock('../../components/shared/service_map/layout', () => ({
  applyDagreLayout: (nodes: unknown[]) => nodes,
}));

const impactMap: InvestigationImpactMapResponse = {
  title: 'Checkout failures',
  entities: [
    {
      id: 'frontend',
      type_id: 'service',
      label: 'frontend',
      annotations: { impacted: true, alert_count: 3 },
    },
    { id: 'checkout', type_id: 'service', label: 'checkout', annotations: { impacted: true } },
    {
      id: 'payments-db',
      type_id: 'postgres',
      label: 'payments-db',
      annotations: { role: 'root_cause', health: 'critical' },
    },
    { id: 'cart', type_id: 'service', label: 'cart', annotations: { health: 'healthy' } },
  ],
  relationships: [
    {
      id: 'frontend->checkout:calls',
      type_id: 'calls',
      source_id: 'frontend',
      target_id: 'checkout',
      on_critical_path: true,
    },
    {
      id: 'checkout->payments-db:reads',
      type_id: 'reads',
      source_id: 'checkout',
      target_id: 'payments-db',
      on_critical_path: true,
    },
    { id: 'frontend->cart:calls', type_id: 'calls', source_id: 'frontend', target_id: 'cart' },
  ],
  entity_types: [
    { id: 'service', label: 'Service', kind: 'service', icon: { agent_name: 'nodejs' } },
    {
      id: 'postgres',
      label: 'PostgreSQL',
      kind: 'dependency',
      icon: { span_type: 'db', span_subtype: 'postgresql' },
    },
  ],
  relationship_types: [
    { id: 'calls', label: 'calls' },
    { id: 'reads', label: 'reads from' },
  ],
  events: [],
  created_at: '2026-11-07T00:00:00.000Z',
};

describe('getImpactSeverityScore', () => {
  it('scores root cause and impacted red, and leaves healthy entities plain', () => {
    expect(getImpactSeverityScore({ role: 'root_cause', impacted: true })).toBe(
      IMPACT_SEVERITY_SCORES.rootCause
    );
    expect(getImpactSeverityScore({ health: 'critical' })).toBe(IMPACT_SEVERITY_SCORES.rootCause);
    expect(getImpactSeverityScore({ role: 'symptom' })).toBe(IMPACT_SEVERITY_SCORES.impacted);
    expect(getImpactSeverityScore({ health: 'degraded' })).toBe(IMPACT_SEVERITY_SCORES.impacted);
    expect(getImpactSeverityScore({ impacted: true })).toBe(IMPACT_SEVERITY_SCORES.impacted);
    expect(getImpactSeverityScore({ health: 'healthy' })).toBeUndefined();
    // Impacted or the cause once, healthy now: no longer red.
    expect(
      getImpactSeverityScore({ role: 'symptom', impacted: true, health: 'healthy' })
    ).toBeUndefined();
    expect(getImpactSeverityScore({ role: 'root_cause', health: 'healthy' })).toBeUndefined();
    expect(getImpactSeverityScore(undefined)).toBeUndefined();
  });
});

describe('getEuiIcon', () => {
  it('uses the named icon, and the Kubernetes logo for Kubernetes types the model left bare', () => {
    expect(
      getEuiIcon({ id: 'x', label: 'X', kind: 'service', icon: { eui_icon: 'logoAWS' } })
    ).toBe('logoAWS');
    expect(getEuiIcon({ id: 'k8s_deployment', label: 'K8s deployment', kind: 'service' })).toBe(
      'logoKubernetes'
    );
    expect(
      getEuiIcon({ id: 'java_service', label: 'Java service', kind: 'service' })
    ).toBeUndefined();
  });
});

describe('infrastructure entities', () => {
  const map: InvestigationImpactMapResponse = {
    created_at: '2026-11-07T00:00:00.000Z',
    entities: [
      { id: 'ship-deploy', type_id: 'k8s_deployment', label: 'shipping Deployment' },
      { id: 'host-1', type_id: 'host', label: 'host-1' },
    ],
    relationships: [],
    entity_types: [
      { id: 'k8s_deployment', label: 'K8s deployment', kind: 'service' },
      { id: 'host', label: 'Host', kind: 'infrastructure', icon: { eui_icon: 'compute' } },
    ],
    relationship_types: [],
    events: [],
  };

  it('draws infrastructure as its own shape, including an older Kubernetes type', () => {
    const { nodes } = transformImpactMap(map, { criticalPath: 'red', recovered: 'green' });
    expect(nodes.map(({ type }) => type)).toEqual(['impactInfrastructure', 'impactInfrastructure']);
    expect(nodes[0].data).toMatchObject({ euiIcon: 'logoKubernetes' });
    expect(nodes[1].data).toMatchObject({ euiIcon: 'compute' });
  });
});

describe('getImpactState', () => {
  it('badges a root cause over merely impacted, and leaves healthy nodes alone', () => {
    expect(getImpactState({ role: 'root_cause', impacted: true })).toBe('root_cause');
    expect(getImpactState({ role: 'symptom', impacted: true })).toBe('impacted');
    expect(getImpactState({ impacted: true })).toBe('impacted');
    expect(getImpactState({ health: 'healthy' })).toBeUndefined();
    // Hurt or the cause once, and healthy now: recovered, to show a green check.
    expect(getImpactState({ role: 'symptom', impacted: true, health: 'healthy' })).toBe(
      'recovered'
    );
    expect(getImpactState({ role: 'root_cause', impacted: true, health: 'healthy' })).toBe(
      'recovered'
    );
  });
});

describe('transformImpactMap', () => {
  const { nodes, edges } = transformImpactMap(impactMap, {
    criticalPath: 'red',
    recovered: 'green',
  });

  it('draws services as service nodes and dependencies as diamonds, with their icons', () => {
    expect(nodes.find(({ id }) => id === 'frontend')).toMatchObject({
      type: 'service',
      data: {
        agentName: 'nodejs',
        alertsCount: 3,
        serviceAnomalyStats: { anomalyScore: IMPACT_SEVERITY_SCORES.impacted },
      },
    });
    expect(nodes.find(({ id }) => id === 'payments-db')).toMatchObject({
      type: 'impactDependency',
      data: {
        spanType: 'db',
        spanSubtype: 'postgresql',
        severityScore: IMPACT_SEVERITY_SCORES.rootCause,
      },
    });
    expect(nodes.find(({ id }) => id === 'cart')?.data).not.toHaveProperty('serviceAnomalyStats');
  });

  it('draws the critical path thicker in its colour and labels edges with the relationship', () => {
    const critical = edges.find(({ id }) => id === 'checkout->payments-db:reads');
    expect(critical).toMatchObject({
      label: 'reads from',
      animated: true,
      style: { stroke: 'red', strokeWidth: 3 },
      markerEnd: { color: 'red' },
      data: { onCriticalPath: true },
    });
    const plain = edges.find(({ id }) => id === 'frontend->cart:calls');
    expect(plain).toMatchObject({ label: 'calls', animated: false, style: DEFAULT_EDGE_STYLE });
  });
});

describe('event counts', () => {
  const at = '2026-11-07T10:00:00.000Z';
  const { nodes, edges } = transformImpactMap(
    {
      ...impactMap,
      events: [
        { id: 'a', kind: 'change', title: 'Deployed', at, entity_id: 'payments-db' },
        { id: 'b', kind: 'failure', title: 'Failed', at, entity_id: 'payments-db' },
        {
          id: 'c',
          kind: 'failure',
          title: 'Timed out',
          at,
          relationship_id: 'checkout->payments-db:reads',
        },
        { id: 'd', kind: 'response', title: 'Channel opened', at },
      ],
    },
    { criticalPath: 'red', recovered: 'green' }
  );

  it('counts the events of each entity and relationship', () => {
    expect(nodes.find(({ id }) => id === 'payments-db')?.data.eventCount).toBe(2);
    expect(nodes.find(({ id }) => id === 'cart')?.data.eventCount).toBe(0);
    expect(edges.find(({ id }) => id === 'checkout->payments-db:reads')).toMatchObject({
      label: 'reads from · 1 event',
      data: { eventCount: 1 },
    });
  });
});

describe('ImpactServiceMap', () => {
  it('renders every entity with its label, the alert badge and the legend', () => {
    render(<ImpactServiceMap impactMap={impactMap} />);

    for (const label of ['frontend', 'checkout', 'payments-db', 'cart']) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
    expect(screen.getByTestId('serviceMapNodeAlertsBadge')).toBeInTheDocument();
    expect(screen.getByTestId('impactServiceMapLegend')).toHaveTextContent('Critical path');
    // Only the root cause is badged; what it hurt is shown by its red border.
    expect(screen.getAllByTestId('impactMapBadge-root_cause').length).toBeGreaterThan(1);
    expect(screen.queryByTestId('impactMapBadge-impacted')).not.toBeInTheDocument();
  });

  it('reports a click on any node, a service included, so its events open', () => {
    const onEntityClick = jest.fn();
    render(<ImpactServiceMap impactMap={impactMap} onEntityClick={onEntityClick} />);

    fireEvent.click(screen.getByText('checkout'));
    fireEvent.click(screen.getByText('payments-db'));

    expect(onEntityClick.mock.calls).toEqual([['checkout'], ['payments-db']]);
  });

  it('has the service map zoom, fit and full-screen controls', () => {
    const onToggleFullScreen = jest.fn();
    render(<ImpactServiceMap impactMap={impactMap} onToggleFullScreen={onToggleFullScreen} />);

    for (const id of ['ZoomIn', 'ZoomOut', 'FitView', 'FullScreen']) {
      expect(screen.getByTestId(`impactServiceMap${id}Button`)).toBeInTheDocument();
    }
    fireEvent.click(screen.getByTestId('impactServiceMapFullScreenButton'));
    expect(onToggleFullScreen).toHaveBeenCalledTimes(1);
  });
});

describe('a recovered impact map', () => {
  const recoveredMap = {
    ...impactMap,
    entities: impactMap.entities.map((entity) => ({
      ...entity,
      annotations: { ...entity.annotations, health: 'healthy' as const },
    })),
  };

  it('badges what was hurt and is healthy again as recovered, not impacted', () => {
    const { nodes } = transformImpactMap(recoveredMap, { criticalPath: 'red', recovered: 'green' });

    expect(nodes.filter(({ data }) => data.impactState === 'recovered').length).toBeGreaterThan(0);
    expect(nodes.some(({ data }) => data.impactState === 'impacted')).toBe(false);
    expect(nodes.some(({ data }) => data.impactState === 'root_cause')).toBe(false);
  });

  it('draws a critical-path link green and still once its entity has recovered', () => {
    const colors = { criticalPath: 'red', recovered: 'green' };
    const before = transformImpactMap(impactMap, colors).edges.find(
      ({ data }) => data.onCriticalPath
    );
    const after = transformImpactMap(recoveredMap, colors).edges.find(
      ({ id }) => id === before?.id
    );

    expect(before).toMatchObject({ style: { stroke: 'red' }, animated: true });
    expect(after).toMatchObject({
      style: { stroke: 'green' },
      animated: false,
      data: { recovered: true },
    });
  });
});

describe('customer impact on the map', () => {
  it('marks the entities a customer impact event happened to', () => {
    const map = {
      ...impactMap,
      events: [
        {
          id: 'ci',
          kind: 'customer_impact' as const,
          title: 'Checkout failed',
          at: '2026-11-07T10:00:00Z',
          entity_id: 'checkout',
        },
        {
          id: 'f',
          kind: 'failure' as const,
          title: 'Payments slow',
          at: '2026-11-07T10:00:00Z',
          entity_id: 'payments-db',
        },
      ],
    };
    const { nodes } = transformImpactMap(map, { criticalPath: 'red', recovered: 'green' });

    expect(nodes.find(({ id }) => id === 'checkout')?.data.hasCustomerImpact).toBe(true);
    expect(nodes.find(({ id }) => id === 'payments-db')?.data.hasCustomerImpact).toBe(false);
  });
});
