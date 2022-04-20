/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ClusterComponentTemplate } from '@elastic/elasticsearch/lib/api/types';

import uuid from 'uuid';

import type { InstallablePackage, RegistryDataStream } from '../../../../types';

import { _getLegacyComponentTemplatesForPackage } from './remove_legacy';

const pickRandom = (arr: any[]) => arr[Math.floor(Math.random() * arr.length)];
const pickRandomType = pickRandom.bind(null, ['logs', 'metrics']);
const createMockDataStream = ({
  packageName,
  type,
  dataset,
}: {
  packageName: string;
  type?: string;
  dataset?: string;
}) => {
  return {
    type: type || pickRandomType(),
    dataset: dataset || uuid.v4(),
    title: packageName,
    package: packageName,
    path: 'some_path',
    release: 'ga',
  } as RegistryDataStream;
};
const createMockTemplate = ({
  name = 'templateName',
  packageName,
}: {
  name?: string;
  packageName: string;
}) => {
  return {
    name,
    component_template: {
      _meta: {
        package: { name: packageName },
      },
      template: {
        settings: {},
      },
    },
  } as ClusterComponentTemplate;
};

const makeArrayOf = (arraySize: number, fn = (i: any) => i) => {
  return [...Array(arraySize)].map(fn);
};
describe('_getLegacyComponentTemplatesForPackage', () => {
  it('should handle empty templates array', () => {
    const templates = [] as ClusterComponentTemplate[];
    const pkg = { name: 'testPkg', data_streams: [] as RegistryDataStream[] } as InstallablePackage;

    const result = _getLegacyComponentTemplatesForPackage(templates, pkg);
    expect(result).toEqual([]);
  });
  it('should return empty array if no legacy templates', () => {
    const packageName = 'testPkg';
    const templates = makeArrayOf(1000, () => createMockTemplate({ packageName }));
    const pkg = {
      name: packageName,
      data_streams: makeArrayOf(100, () => createMockDataStream({ packageName })),
    } as InstallablePackage;

    const result = _getLegacyComponentTemplatesForPackage(templates, pkg);
    expect(result).toEqual([]);
  });

  it('should find legacy templates', () => {
    const packageName = 'testPkg';
    const legacyTemplates = [
      'logs-testPkg.dataset@settings',
      'logs-testPkg.dataset@mappings',
      'metrics-testPkg.dataset2@mappings',
      'metrics-testPkg.dataset2@settings',
    ];
    const templates = [
      ...makeArrayOf(100, () => createMockTemplate({ packageName })),
      ...legacyTemplates.map((name) => createMockTemplate({ name, packageName })),
    ];
    const pkg = {
      name: packageName,
      data_streams: [
        ...makeArrayOf(20, () => createMockDataStream({ packageName })),
        createMockDataStream({ type: 'logs', packageName, dataset: 'testPkg.dataset' }),
        createMockDataStream({ type: 'metrics', packageName, dataset: 'testPkg.dataset2' }),
      ],
    } as InstallablePackage;

    const result = _getLegacyComponentTemplatesForPackage(templates, pkg);
    expect(result).toEqual(legacyTemplates);
  });

  it('should only return templates if package name matches as well', () => {
    const packageName = 'testPkg';
    const legacyTemplates = [
      'logs-testPkg.dataset@settings',
      'logs-testPkg.dataset@mappings',
      'metrics-testPkg.dataset2@mappings',
      'metrics-testPkg.dataset2@settings',
    ];
    const templates = [
      ...makeArrayOf(20, () => createMockTemplate({ packageName })),
      ...legacyTemplates.map((name) => createMockTemplate({ name, packageName: 'someOtherPkg' })),
    ];
    const pkg = {
      name: packageName,
      data_streams: [
        ...makeArrayOf(20, () => createMockDataStream({ packageName })),
        createMockDataStream({ type: 'logs', packageName, dataset: 'testPkg.dataset' }),
        createMockDataStream({ type: 'metrics', packageName, dataset: 'testPkg.dataset2' }),
      ],
    } as InstallablePackage;

    const result = _getLegacyComponentTemplatesForPackage(templates, pkg);
    expect(result).toEqual([]);
  });
});
