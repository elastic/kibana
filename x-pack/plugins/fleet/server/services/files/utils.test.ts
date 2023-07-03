/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getFileDataIndexName, getFileMetadataIndexName } from '../../../common';

import { parseFileStorageIndex } from './utils';

describe('Files service utils', () => {
  describe('parseFileStorageIndex()', () => {
    it.each([
      [
        'tohost meta',
        '.ds-.fleet-fileds-tohost-meta-endpoint-2023.07.03-000001',
        { index: getFileMetadataIndexName('endpoint', true), integration: 'endpoint' },
      ],
      [
        'tohost data',
        '.ds-.fleet-fileds-tohost-data-agent-2023.07.03-000001',
        { index: getFileDataIndexName('agent', true), integration: 'agent' },
      ],
      [
        'fromhost meta',
        '.ds-.fleet-fileds-fromhost-meta-agent-2023.07.03-000001',
        { index: getFileMetadataIndexName('agent'), integration: 'agent' },
      ],
      [
        'fromhost data',
        '.ds-.fleet-fileds-fromhost-data-endpoint-2023.07.03-000001',
        { index: getFileDataIndexName('endpoint'), integration: 'endpoint' },
      ],
    ])('should parse index %s', (_, index, result) => {
      expect(parseFileStorageIndex(index)).toEqual(result);
    });

    it('should error if index does not match a knonwn pattern', () => {
      expect(() => parseFileStorageIndex('foo')).toThrow();
    });
  });
});
