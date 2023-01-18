/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ClusterComponentTemplate,
  IndicesGetIndexTemplateIndexTemplateItem,
} from '@elastic/elasticsearch/lib/api/types';

import type { Logger } from '@kbn/core/server';

import { v4 as uuid } from 'uuid';

import { loggingSystemMock } from '@kbn/core/server/mocks';

import type { InstallablePackage, RegistryDataStream } from '../../../../types';

import {
  _getLegacyComponentTemplatesForPackage,
  _getIndexTemplatesToUsedByMap,
  _filterComponentTemplatesInUse,
} from './remove_legacy';

const mockLogger: Logger = loggingSystemMock.create().get();

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
const createMockComponentTemplate = ({
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

const createMockTemplate = ({ name, composedOf = [] }: { name: string; composedOf?: string[] }) =>
  ({
    name,
    index_template: {
      composed_of: composedOf,
    },
  } as IndicesGetIndexTemplateIndexTemplateItem);

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
    const templates = makeArrayOf(1000, () => createMockComponentTemplate({ packageName }));
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
      ...makeArrayOf(100, () => createMockComponentTemplate({ packageName })),
      ...legacyTemplates.map((name) => createMockComponentTemplate({ name, packageName })),
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
      ...makeArrayOf(20, () => createMockComponentTemplate({ packageName })),
      ...legacyTemplates.map((name) =>
        createMockComponentTemplate({ name, packageName: 'someOtherPkg' })
      ),
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

describe('_getIndexTemplatesToUsedByMap', () => {
  it('should return empty map if no index templates provided', () => {
    const indexTemplates = [] as IndicesGetIndexTemplateIndexTemplateItem[];

    const result = _getIndexTemplatesToUsedByMap(indexTemplates);

    expect(result.size).toEqual(0);
  });

  it('should return empty map if no index templates have no component templates', () => {
    const indexTemplates = [createMockTemplate({ name: 'tmpl1' })];

    const result = _getIndexTemplatesToUsedByMap(indexTemplates);

    expect(result.size).toEqual(0);
  });

  it('should return correct map if templates have composedOf', () => {
    const indexTemplates = [
      createMockTemplate({ name: 'tmpl1' }),
      createMockTemplate({ name: 'tmpl2', composedOf: ['ctmp1'] }),
      createMockTemplate({ name: 'tmpl3', composedOf: ['ctmp1', 'ctmp2'] }),
      createMockTemplate({ name: 'tmpl4', composedOf: ['ctmp3'] }),
    ];

    const expectedMap = {
      ctmp1: ['tmpl2', 'tmpl3'],
      ctmp2: ['tmpl3'],
      ctmp3: ['tmpl4'],
    };

    const result = _getIndexTemplatesToUsedByMap(indexTemplates);

    expect(Object.fromEntries(result)).toEqual(expectedMap);
  });
});

describe('_filterComponentTemplatesInUse', () => {
  it('should return empty array if provided with empty component templates', () => {
    const componentTemplateNames = [] as string[];
    const indexTemplates = [] as IndicesGetIndexTemplateIndexTemplateItem[];

    const result = _filterComponentTemplatesInUse({
      componentTemplateNames,
      indexTemplates,
      logger: mockLogger,
    });

    expect(result).toHaveLength(0);
  });

  it('should remove component template used by index template ', () => {
    const componentTemplateNames = ['ctmp1', 'ctmp2'] as string[];
    const indexTemplates = [
      createMockTemplate({ name: 'tmpl1', composedOf: ['ctmp1'] }),
    ] as IndicesGetIndexTemplateIndexTemplateItem[];

    const result = _filterComponentTemplatesInUse({
      componentTemplateNames,
      indexTemplates,
      logger: mockLogger,
    });

    expect(result).toEqual(['ctmp2']);
  });
  it('should remove component templates used by one index template ', () => {
    const componentTemplateNames = ['ctmp1', 'ctmp2', 'ctmp3'] as string[];
    const indexTemplates = [
      createMockTemplate({ name: 'tmpl1', composedOf: ['ctmp1', 'ctmp2'] }),
    ] as IndicesGetIndexTemplateIndexTemplateItem[];

    const result = _filterComponentTemplatesInUse({
      componentTemplateNames,
      indexTemplates,
      logger: mockLogger,
    });

    expect(result).toEqual(['ctmp3']);
  });
  it('should remove component templates used by different index templates ', () => {
    const componentTemplateNames = ['ctmp1', 'ctmp2', 'ctmp3'] as string[];
    const indexTemplates = [
      createMockTemplate({ name: 'tmpl1', composedOf: ['ctmp1'] }),
      createMockTemplate({ name: 'tmpl2', composedOf: ['ctmp2'] }),
    ] as IndicesGetIndexTemplateIndexTemplateItem[];

    const result = _filterComponentTemplatesInUse({
      componentTemplateNames,
      indexTemplates,
      logger: mockLogger,
    });

    expect(result).toEqual(['ctmp3']);
  });
  it('should remove component templates used by multiple index templates ', () => {
    const componentTemplateNames = ['ctmp1', 'ctmp2', 'ctmp3'] as string[];
    const indexTemplates = [
      createMockTemplate({ name: 'tmpl1', composedOf: ['ctmp1', 'ctmp2'] }),
      createMockTemplate({ name: 'tmpl2', composedOf: ['ctmp2', 'ctmp1'] }),
    ] as IndicesGetIndexTemplateIndexTemplateItem[];

    const result = _filterComponentTemplatesInUse({
      componentTemplateNames,
      indexTemplates,
      logger: mockLogger,
    });

    expect(result).toEqual(['ctmp3']);
  });
});
