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
  packageName = 'somepkg',
  dataset,
}: {
  packageName?: string;
  dataset?: string;
} = {}) => {
  return {
    type: pickRandomType(),
    dataset: dataset || uuid.v4(),
    title: packageName,
    package: packageName,
    path: 'some_path',
    release: 'ga',
  } as RegistryDataStream;
};
const createMockTemplate = ({
  name = 'templateName',
  packageName = 'somePackage',
}: {
  name?: string;
  packageName?: string;
} = {}) => {
  return {
    name,
    component_template: {
      _meta: {
        package: packageName,
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
  it('should handle empty array', () => {
    const templates = [] as ClusterComponentTemplate[];
    const pkg = {} as InstallablePackage;

    const result = _getLegacyComponentTemplatesForPackage(templates, pkg);
    expect(result).toEqual([]);
  });
  it('should return empty array if no legacy templates', () => {
    const templates = makeArrayOf(1000, createMockTemplate);
    const pkg = {
      data_streams: makeArrayOf(100, createMockDataStream),
    } as InstallablePackage;

    const result = _getLegacyComponentTemplatesForPackage(templates, pkg);
    expect(result).toEqual([]);
  });

  it('should find legacy templates', () => {
    const packageName = 'myPkg';
    const legacyTemplates = [
      'logs-mypkg.dataset@settings',
      'logs-mypkg.dataset@mappings',
      'logs-mypkg.dataset2@mappings',
      'logs-mypkg.dataset2@settings',
    ];
    const templates = [
      ...makeArrayOf(100, createMockTemplate),
      ...legacyTemplates.map((name) => createMockTemplate({ name, packageName })),
    ];
    const pkg = {
      data_streams: [
        ...makeArrayOf(20, createMockDataStream),
        createMockDataStream({ packageName, dataset: 'mypkg.dataset' }),
        createMockDataStream({ packageName, dataset: 'mypkg.dataset2' }),
      ],
    } as InstallablePackage;

    const result = _getLegacyComponentTemplatesForPackage(templates, pkg);
    expect(result).toEqual(legacyTemplates);
  });
});
