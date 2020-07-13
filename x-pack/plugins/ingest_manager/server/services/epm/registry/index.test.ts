/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AssetParts } from '../../../types';
import { pathParts, groupPathsByService } from './index';

const testPaths = [
  {
    path: 'foo-1.1.0/service/type/file.yml',
    assetParts: {
      dataset: undefined,
      file: 'file.yml',
      path: 'foo-1.1.0/service/type/file.yml',
      pkgkey: 'foo-1.1.0',
      service: 'service',
      type: 'type',
    },
  },
  {
    path: 'iptables-1.0.4/kibana/visualization/683402b0-1f29-11e9-8ec4-cf5d91a864b3-ecs.json',
    assetParts: {
      dataset: undefined,
      file: '683402b0-1f29-11e9-8ec4-cf5d91a864b3-ecs.json',
      path: 'iptables-1.0.4/kibana/visualization/683402b0-1f29-11e9-8ec4-cf5d91a864b3-ecs.json',
      pkgkey: 'iptables-1.0.4',
      service: 'kibana',
      type: 'visualization',
    },
  },
  {
    path: 'coredns-1.0.1/dataset/stats/fields/coredns.stats.yml',
    assetParts: {
      dataset: 'stats',
      file: 'coredns.stats.yml',
      path: 'coredns-1.0.1/dataset/stats/fields/coredns.stats.yml',
      pkgkey: 'coredns-1.0.1',
      service: '',
      type: 'fields',
    },
  },
];

test('testPathParts', () => {
  for (const value of testPaths) {
    expect(pathParts(value.path)).toStrictEqual(value.assetParts as AssetParts);
  }
});

test('groupPathsByService', () => {
  const dashboardPaths = [
    'foo-1.1.0/kibana/dashboard/a.json',
    'foo-1.1.0/kibana/dashboard/b.json',
    'foo-1.1.0/kibana/dashboard/c.json',
  ];

  const visualizationPaths = [
    'foo-1.1.0/kibana/visualization/a.json',
    'foo-1.1.0/kibana/visualization/b.json',
  ];

  const canvasTemplatePaths = ['foo-1.1.0/kibana/canvas-workpad-template/a.json'];

  const unknownAssetPaths = ['foo-1.1.0/kibana/unkown/a.json'];

  const pathsByService = groupPathsByService([
    ...dashboardPaths,
    ...visualizationPaths,
    ...canvasTemplatePaths,
    ...unknownAssetPaths,
  ]);

  expect(pathsByService.kibana.dashboard).toHaveLength(dashboardPaths.length);
  expect(pathsByService.kibana.visualization).toHaveLength(visualizationPaths.length);
  expect(pathsByService.kibana['canvas-workpad-template']).toHaveLength(canvasTemplatePaths.length);
  // TS-Ingore to make sure this unkown value does not end up on the result
  // @ts-ignore
  expect(pathsByService.kibana.unknown).toBeUndefined();
});
