/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { sortNodes } from './sort_nodes';
import { SnapshotNode } from '../../../../../common/http_api/snapshot_api';

const nodes: SnapshotNode[] = [
  {
    path: [{ value: 'host-01', label: 'host-01' }],
    metrics: [
      {
        name: 'cpu',
        value: 0.5,
        max: 1.5,
        avg: 0.7,
      },
    ],
  },
  {
    path: [{ value: 'host-02', label: 'host-02' }],
    metrics: [
      {
        name: 'cpu',
        value: 0.2,
        max: 0.7,
        avg: 0.4,
      },
    ],
  },
];

describe('sortNodes', () => {
  describe('asc', () => {
    it('should sort by name', () => {
      const sortedNodes = sortNodes({ by: 'name', direction: 'asc' }, nodes);
      expect(sortedNodes).toEqual(nodes);
    });
    it('should sort by merics', () => {
      const sortedNodes = sortNodes({ by: 'value', direction: 'asc' }, nodes);
      expect(sortedNodes).toEqual(nodes.reverse());
    });
  });
  describe('desc', () => {
    it('should sort by name', () => {
      const sortedNodes = sortNodes({ by: 'name', direction: 'desc' }, nodes);
      expect(sortedNodes).toEqual(nodes.reverse());
    });
    it('should sort by merics', () => {
      const sortedNodes = sortNodes({ by: 'value', direction: 'desc' }, nodes);
      expect(sortedNodes).toEqual(nodes);
    });
  });
});
