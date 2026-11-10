/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Edge, Node } from '@xyflow/react';
import { applyGroupedLayout, hasGroups } from './group_layout';
import { transformImpactMap } from './transform_impact_map';

const OPTIONS = { nodeWidth: 120, nodeHeight: 80, ranksep: 90, nodesep: 50 };

const node = (id: string, parentId?: string): Node<{ parentId?: string }> => ({
  id,
  position: { x: 0, y: 0 },
  data: { parentId },
});
const edge = (source: string, target: string): Edge => ({
  id: `${source}-${target}`,
  source,
  target,
});

const box = (n: Node & { width?: number; height?: number }) => ({
  left: n.position.x,
  top: n.position.y,
  right: n.position.x + (n.width ?? 120),
  bottom: n.position.y + (n.height ?? 80),
});

describe('applyGroupedLayout', () => {
  it('puts members inside their box, and sibling boxes apart', () => {
    const nodes = [
      node('zone-a'),
      node('zone-b'),
      node('a1', 'zone-a'),
      node('a2', 'zone-a'),
      node('b1', 'zone-b'),
      node('lb'),
    ];
    const laidOut = applyGroupedLayout(
      nodes,
      [edge('lb', 'a1'), edge('lb', 'b1'), edge('a1', 'a2')],
      OPTIONS
    );
    const at = (id: string) => laidOut.find((n) => n.id === id)!;

    // Absolute positions (no RF parentId) so edges into a member do not U-turn; members still
    // sit inside their group's box on the canvas.
    expect(at('a1').parentId).toBeUndefined();
    expect(at('a2').parentId).toBeUndefined();
    expect(at('b1').parentId).toBeUndefined();
    const zoneA = box(at('zone-a'));
    const a1 = box(at('a1'));
    expect(a1.left).toBeGreaterThanOrEqual(zoneA.left);
    expect(a1.top).toBeGreaterThanOrEqual(zoneA.top);
    expect(a1.right).toBeLessThanOrEqual(zoneA.right);
    expect(a1.bottom).toBeLessThanOrEqual(zoneA.bottom);

    const [a, b] = [box(at('zone-a')), box(at('zone-b'))];
    const overlap = a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
    expect(overlap).toBe(false);
  });

  it('nests boxes and cuts a parent loop instead of failing', () => {
    const nested = applyGroupedLayout(
      [node('region'), node('zone', 'region'), node('host', 'zone')],
      [],
      OPTIONS
    );
    const region = nested.find((n) => n.id === 'region')!;
    const zone = nested.find((n) => n.id === 'zone')!;
    const host = nested.find((n) => n.id === 'host')!;
    expect(zone.parentId).toBeUndefined();
    expect(host.parentId).toBeUndefined();
    expect(zone.width).toBeGreaterThan(0);
    const regionBox = box(region);
    const zoneBox = box(zone);
    expect(zoneBox.left).toBeGreaterThanOrEqual(regionBox.left);
    expect(zoneBox.top).toBeGreaterThanOrEqual(regionBox.top);
    expect(host.position.x).toBeGreaterThanOrEqual(zoneBox.left);

    expect(() =>
      applyGroupedLayout([node('x', 'y'), node('y', 'x')], [edge('x', 'y')], OPTIONS)
    ).not.toThrow();
  });

  it('knows when a map has no groups', () => {
    expect(hasGroups([node('a'), node('b')])).toBe(false);
    expect(hasGroups([node('a'), node('b', 'a')])).toBe(true);
    expect(hasGroups([node('b', 'missing')])).toBe(false);
  });

  it('keeps members of a group on one row even when cross-group edges fan out', () => {
    const laidOut = applyGroupedLayout(
      [
        node('ui'),
        node('pipe'),
        node('otel'),
        node('fe', 'ui'),
        node('kib', 'ui'),
        node('box', 'pipe'),
        node('idx', 'pipe'),
        node('src', 'pipe'),
        node('collector', 'otel'),
        node('host', 'otel'),
      ],
      [
        edge('fe', 'kib'),
        edge('kib', 'box'),
        edge('box', 'idx'),
        edge('idx', 'src'),
        // Fan-out out of the pipeline — must not yank sourcerer off the pipeline row.
        edge('idx', 'collector'),
        edge('src', 'collector'),
        edge('idx', 'host'),
        edge('collector', 'host'),
      ],
      { nodeWidth: 160, nodeHeight: 100, ranksep: 140, nodesep: 72 }
    );
    const at = (id: string) => laidOut.find((n) => n.id === id)!;
    expect(at('box').position.y).toBe(at('idx').position.y);
    expect(at('idx').position.y).toBe(at('src').position.y);
    expect(at('fe').parentId).toBeUndefined();
    expect(at('src').parentId).toBeUndefined();
    const uiBox = box(at('ui'));
    expect(box(at('fe')).left).toBeGreaterThanOrEqual(uiBox.left);
    expect(box(at('fe')).right).toBeLessThanOrEqual(uiBox.right);
  });

  it('packs an isolated context group under the flow instead of blowing out the parent', () => {
    const laidOut = applyGroupedLayout(
      [
        node('env'),
        node('ui', 'env'),
        node('pipe', 'env'),
        node('sources', 'env'),
        node('fe', 'ui'),
        node('kib', 'ui'),
        node('box', 'pipe'),
        node('r1', 'sources'),
        node('r2', 'sources'),
      ],
      [edge('fe', 'kib'), edge('kib', 'box')],
      { nodeWidth: 120, nodeHeight: 80, ranksep: 100, nodesep: 40 }
    );
    const at = (id: string) => laidOut.find((n) => n.id === id)!;
    // Sources sit below the UI/pipeline row inside env — not off to the side creating a void.
    expect(at('sources').position.y).toBeGreaterThan(at('ui').position.y);
    expect(at('r1').parentId).toBeUndefined();
    const sourcesBox = box(at('sources'));
    expect(box(at('r1')).left).toBeGreaterThanOrEqual(sourcesBox.left);
    expect(at('r2').position.y).toBeGreaterThan(at('r1').position.y);
    // Sibling flow groups share a top edge.
    expect(at('ui').position.y).toBe(at('pipe').position.y);
  });
});

describe('transformImpactMap groups and inferred links', () => {
  it('draws an entity that holds others as a box, and a guessed link dashed', () => {
    const { nodes, edges } = transformImpactMap(
      {
        id: 'map',
        title: 'Zone loss',
        entities: [
          { id: 'zone', type_id: 'cloud.availability_zone', label: 'Zone b' },
          { id: 'alloc', type_id: 'controller', label: 'Allocator', parent_id: 'zone' },
          { id: 'db', type_id: 'db.elasticsearch', label: 'Cluster', parent_id: 'missing' },
        ],
        relationships: [
          {
            id: 'alloc->db',
            type_id: 'writes_to',
            source_id: 'alloc',
            target_id: 'db',
            source: 'inferred',
            label: 'maybe',
          },
        ],
        entity_types: [
          { id: 'cloud.availability_zone', label: 'Availability zone', kind: 'infrastructure' },
          { id: 'controller', label: 'Controller', kind: 'infrastructure' },
          { id: 'db.elasticsearch', label: 'Elasticsearch', kind: 'infrastructure' },
        ],
        relationship_types: [{ id: 'writes_to', label: 'WRITES_TO' }],
        events: [],
      } as never,
      { criticalPath: 'red' }
    );

    expect(nodes.find(({ id }) => id === 'zone')?.type).toBe('impactGroup');
    expect(nodes.find(({ id }) => id === 'alloc')?.data).toMatchObject({ parentId: 'zone' });
    // A parent the map does not hold draws nothing, and the entity is still drawn.
    expect(nodes.find(({ id }) => id === 'db')?.data).not.toHaveProperty('parentId', 'missing');
    // Inferred and not on the critical path: dashed, no label.
    expect(edges[0].label).toBeUndefined();
    expect(edges[0].style).toMatchObject({ strokeDasharray: '6 4', opacity: 0.35 });
  });

  it('hides ownership links and orphan team nodes so they do not cross the path', () => {
    const { nodes, edges } = transformImpactMap(
      {
        id: 'map',
        title: 'Owners',
        entities: [
          { id: 'svc', type_id: 'svc', label: 'svc', annotations: { role: 'root_cause' } },
          { id: 'db', type_id: 'db', label: 'db' },
          { id: 'team', type_id: 'team', label: 'Nightshift' },
        ],
        relationships: [
          {
            id: 'svc->db',
            type_id: 'calls',
            source_id: 'svc',
            target_id: 'db',
            on_critical_path: true,
          },
          {
            id: 'svc->team',
            type_id: 'owned_by',
            source_id: 'svc',
            target_id: 'team',
          },
        ],
        entity_types: [
          { id: 'svc', label: 'Service', kind: 'service', icon: { agent_name: 'nodejs' } },
          { id: 'db', label: 'Database', kind: 'infrastructure', icon: { eui_icon: 'database' } },
          { id: 'team', label: 'Team', kind: 'infrastructure', icon: { eui_icon: 'users' } },
        ],
        relationship_types: [
          { id: 'calls', label: 'calls' },
          { id: 'owned_by', label: 'owned by' },
        ],
        events: [],
      } as never,
      { criticalPath: 'red' }
    );

    expect(edges.map(({ id }) => id)).toEqual(['svc->db']);
    expect(nodes.map(({ id }) => id).sort()).toEqual(['db', 'svc']);
    // Generic type verbs stay off the canvas; only custom labels are drawn.
    expect(edges[0].label).toBeUndefined();
  });

  it('hides deploy provenance the same way as ownership', () => {
    const { edges } = transformImpactMap(
      {
        id: 'map',
        title: 'Deploy',
        entities: [
          { id: 'svc', type_id: 'svc', label: 'svc' },
          { id: 'repo', type_id: 'repository', label: 'elastic/svc' },
        ],
        relationships: [
          {
            id: 'svc->repo',
            type_id: 'deployed_by',
            source_id: 'svc',
            target_id: 'repo',
          },
        ],
        entity_types: [
          { id: 'svc', label: 'Service', kind: 'service', icon: { agent_name: 'nodejs' } },
          {
            id: 'repository',
            label: 'Repository',
            kind: 'infrastructure',
            icon: { eui_icon: 'branch' },
          },
        ],
        relationship_types: [{ id: 'deployed_by', label: 'deployed by' }],
        events: [],
      } as never,
      { criticalPath: 'red' }
    );
    expect(edges).toHaveLength(0);
  });
});
