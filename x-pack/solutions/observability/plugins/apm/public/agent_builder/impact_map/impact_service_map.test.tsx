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
import { ImpactServiceMap } from './impact_service_map';
import {
  IMPACT_SEVERITY_SCORES,
  getEntityTypeTooltip,
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
      kind: 'infrastructure',
      icon: { eui_icon: 'logoPostgres' },
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
    expect(getImpactSeverityScore(undefined)).toBeUndefined();
  });
});

describe('getEntityTypeTooltip', () => {
  it('uses kind and catalog label, or span type and subtype when present', () => {
    expect(
      getEntityTypeTooltip(
        { id: 'service', label: 'Service', kind: 'service' },
        'service',
        'nodejs'
      )
    ).toEqual({ typeKindLabel: 'Service', subtypeLabel: 'nodejs' });
    expect(
      getEntityTypeTooltip(
        { id: 'host', label: 'Host', kind: 'infrastructure' },
        'host'
      )
    ).toEqual({ typeKindLabel: 'Infrastructure', subtypeLabel: 'Host' });
    expect(
      getEntityTypeTooltip(
        {
          id: 'postgres',
          label: 'PostgreSQL',
          kind: 'dependency',
          icon: { span_type: 'db', span_subtype: 'postgresql' },
        },
        'postgres'
      )
    ).toEqual({ typeKindLabel: 'db', subtypeLabel: 'postgresql' });
  });
});

describe('getEuiIcon', () => {
  it('uses the named icon, guesses from labels, and never leaves a service empty', () => {
    expect(
      getEuiIcon({ id: 'x', label: 'X', kind: 'service', icon: { eui_icon: 'logoAWS' } })
    ).toBe('logoAWS');
    expect(getEuiIcon({ id: 'k8s_deployment', label: 'K8s deployment', kind: 'service' })).toBe(
      'logoKubernetes'
    );
    expect(getEuiIcon({ id: 'java_service', label: 'Java service', kind: 'service' })).toBe(
      'apps'
    );
    expect(
      getEuiIcon({ id: 'service', label: 'Service', kind: 'service' }, 'Constructor')
    ).toBe('gear');
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
    const { nodes } = transformImpactMap(map, { criticalPath: 'red' });
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
  });
});

describe('transformImpactMap', () => {
  const { nodes, edges } = transformImpactMap(impactMap, { criticalPath: 'red' });

  it('draws only services as circles; a database is a rounded square with its logo', () => {
    expect(nodes.find(({ id }) => id === 'frontend')).toMatchObject({
      type: 'service',
      data: {
        agentName: 'nodejs',
        alertsCount: 3,
        serviceAnomalyStats: { anomalyScore: IMPACT_SEVERITY_SCORES.impacted },
        typeKindLabel: 'Service',
        subtypeLabel: 'nodejs',
      },
    });
    expect(nodes.find(({ id }) => id === 'payments-db')).toMatchObject({
      type: 'impactInfrastructure',
      data: {
        euiIcon: 'logoPostgres',
        severityScore: IMPACT_SEVERITY_SCORES.rootCause,
        typeKindLabel: 'Infrastructure',
        subtypeLabel: 'PostgreSQL',
      },
    });
    expect(nodes.find(({ id }) => id === 'cart')?.data).not.toHaveProperty('serviceAnomalyStats');
  });

  it('reads a stored dependency type as a rounded square with an icon from its span type', () => {
    const stored = transformImpactMap(
      {
        ...impactMap,
        entity_types: impactMap.entity_types.map((type) =>
          type.id === 'postgres'
            ? { ...type, kind: 'dependency', icon: { span_type: 'db', span_subtype: 'postgresql' } }
            : type
        ),
      },
      { criticalPath: 'red' }
    );

    expect(stored.nodes.find(({ id }) => id === 'payments-db')).toMatchObject({
      type: 'impactInfrastructure',
      data: { euiIcon: 'logoPostgres' },
    });
  });

  it('draws the critical path thicker and leaves generic type verbs off the canvas', () => {
    const critical = edges.find(({ id }) => id === 'checkout->payments-db:reads');
    // "reads from" is the type — repeating it on every trunk edge is noise; aria keeps it.
    expect(critical).toMatchObject({
      type: 'impact',
      animated: false,
      ariaLabel: 'reads from',
      style: { stroke: 'red', strokeWidth: 3 },
      markerEnd: { color: 'red' },
      data: { onCriticalPath: true },
    });
    expect(critical).not.toHaveProperty('label');
    const plain = edges.find(({ id }) => id === 'frontend->cart:calls');
    // Context links stay unlabelled and quiet so the critical path is readable.
    expect(plain).toMatchObject({
      animated: false,
      style: expect.objectContaining({ opacity: 0.35 }),
    });
    expect(plain).not.toHaveProperty('label');
  });

  it('paints only custom critical-path labels, and shortens opaque entity ids', () => {
    const { nodes: labelledNodes, edges: labelledEdges } = transformImpactMap(
      {
        ...impactMap,
        entities: [
          ...impactMap.entities,
          {
            id: 'cluster-hex',
            type_id: 'service',
            label: '1656aec22450428391c6fe912bfd463',
          },
        ],
        relationships: [
          {
            id: 'frontend->checkout:calls',
            type_id: 'calls',
            source_id: 'frontend',
            target_id: 'checkout',
            on_critical_path: true,
            label: 'checkout timeout',
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
      },
      { criticalPath: 'red' }
    );

    expect(labelledEdges.find(({ id }) => id === 'frontend->checkout:calls')).toMatchObject({
      type: 'impact',
      label: 'checkout timeout',
    });
    expect(labelledEdges.find(({ id }) => id === 'checkout->payments-db:reads')).not.toHaveProperty(
      'label'
    );
    expect(labelledNodes.find(({ id }) => id === 'cluster-hex')?.data.label).toBe(
      '1656aec2…bfd463'
    );
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
    { criticalPath: 'red' }
  );

  it('counts the events of each entity and relationship', () => {
    expect(nodes.find(({ id }) => id === 'payments-db')?.data.eventCount).toBe(2);
    expect(nodes.find(({ id }) => id === 'cart')?.data.eventCount).toBe(0);
    expect(edges.find(({ id }) => id === 'checkout->payments-db:reads')).toMatchObject({
      // No custom label — show the event count alone, not the generic type verb.
      label: '1 event',
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
