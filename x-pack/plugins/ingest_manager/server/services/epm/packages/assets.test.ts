/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RegistryPackage } from '../../../types';
import { getAssets } from './assets';

const tests = [
  {
    package: {
      assets: [
        '/package/coredns/1.0.1/dataset/log/elasticsearch/ingest-pipeline/pipeline-plaintext.json',
        '/package/coredns/1.0.1/dataset/log/elasticsearch/ingest-pipeline/pipeline-json.json',
      ],
      path: '/package/coredns/1.0.1',
    },
    dataset: 'log',
    filter: (path: string) => {
      return true;
    },
    expected: [
      '/package/coredns/1.0.1/dataset/log/elasticsearch/ingest-pipeline/pipeline-plaintext.json',
      '/package/coredns/1.0.1/dataset/log/elasticsearch/ingest-pipeline/pipeline-json.json',
    ],
  },
  {
    package: {
      assets: [
        '/package/coredns-1.0.1/dataset/log/elasticsearch/ingest-pipeline/pipeline-plaintext.json',
        '/package/coredns-1.0.1/dataset/log/elasticsearch/ingest-pipeline/pipeline-json.json',
      ],
      path: '/package/coredns/1.0.1',
    },
    // Non existant dataset
    dataset: 'foo',
    filter: (path: string) => {
      return true;
    },
    expected: [],
  },
  {
    package: {
      assets: [
        '/package/coredns-1.0.1/dataset/log/elasticsearch/ingest-pipeline/pipeline-plaintext.json',
        '/package/coredns-1.0.1/dataset/log/elasticsearch/ingest-pipeline/pipeline-json.json',
      ],
    },
    // Filter which does not exist
    filter: (path: string) => {
      return path.includes('foo');
    },
    expected: [],
  },
];

test('testGetAssets', () => {
  for (const value of tests) {
    // as needed to pretent it is a RegistryPackage
    const assets = getAssets(value.package as RegistryPackage, value.filter, value.dataset);
    expect(assets).toStrictEqual(value.expected);
  }
});
