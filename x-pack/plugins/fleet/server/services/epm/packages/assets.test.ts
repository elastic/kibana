/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PackageInfo } from '../../../types';

import { getArchiveFilelist } from '../archive/cache';

import { getAssets } from './assets';

jest.mock('../archive/cache', () => {
  return {
    getArchiveFilelist: jest.fn(),
  };
});

const mockedGetArchiveFilelist = getArchiveFilelist as jest.Mock;

test('testGetAssets integration pkg', () => {
  const tests = [
    {
      package: {
        name: 'coredns',
        version: '1.0.1',
      },
      dataset: 'log',
      filter: (path: string) => {
        return true;
      },
      expected: [
        'coredns-1.0.1/data_stream/log/elasticsearch/ingest-pipeline/pipeline-plaintext.json',
        'coredns-1.0.1/data_stream/log/elasticsearch/ingest-pipeline/pipeline-json.json',
      ],
    },
    {
      package: {
        name: 'coredns',
        version: '1.0.1',
      },
      // Non existent dataset
      dataset: 'foo',
      filter: (path: string) => {
        return true;
      },
      expected: [],
    },
    {
      package: {
        name: 'coredns',
        version: '1.0.1',
      },
      // Filter which does not exist
      filter: (path: string) => {
        return path.includes('foo');
      },
      expected: [],
    },
  ];

  mockedGetArchiveFilelist.mockImplementation(() => [
    'coredns-1.0.1/data_stream/log/elasticsearch/ingest-pipeline/pipeline-plaintext.json',
    'coredns-1.0.1/data_stream/log/elasticsearch/ingest-pipeline/pipeline-json.json',
  ]);
  for (const value of tests) {
    // as needed to pretend it is an InstallablePackage
    const assets = getAssets(value.package as PackageInfo, value.filter, value.dataset);
    expect(assets).toStrictEqual(value.expected);
  }
});

test('testGetAssets input pkg', () => {
  mockedGetArchiveFilelist.mockImplementation(() => [
    'input_package_upgrade-1.0.0/agent/input/input.yml.hbs',
    'input_package_upgrade-1.0.0/changelog.yml',
    'input_package_upgrade-1.0.0/docs/README.md',
    'input_package_upgrade-1.0.0/fields/input.yml',
    'input_package_upgrade-1.0.0/img/sample-logo.svg',
    'input_package_upgrade-1.0.0/img/sample-screenshot.png',
    'input_package_upgrade-1.0.0/manifest.yml',
  ]);

  const tests = [
    {
      package: {
        name: 'input_package_upgrade',
        version: '1.0.0',
        type: 'input',
      },
      dataset: 'log',
      filter: (path: string) => {
        return true;
      },
      expected: [
        'input_package_upgrade-1.0.0/agent/input/input.yml.hbs',
        'input_package_upgrade-1.0.0/fields/input.yml',
      ],
    },
  ];

  for (const value of tests) {
    // as needed to pretend it is an InstallablePackage
    const assets = getAssets(value.package as PackageInfo, value.filter, value.dataset);
    expect(assets).toStrictEqual(value.expected);
  }
});
