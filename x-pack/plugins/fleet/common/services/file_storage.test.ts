/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FILE_STORAGE_METADATA_INDEX_PATTERN } from '../constants';

import { getFileDataIndexName, getFileMetadataIndexName } from '..';

import { getIntegrationNameFromIndexName } from './file_storage';

describe('File Storage services', () => {
  describe('File Index Names', () => {
    it('should generate file metadata index name for files received from host', () => {
      expect(getFileMetadataIndexName('foo')).toEqual('.fleet-fileds-fromhost-meta-foo');
    });

    it('should generate file data index name for files received from host', () => {
      expect(getFileDataIndexName('foo')).toEqual('.fleet-fileds-fromhost-data-foo');
    });

    it('should generate file metadata index name for files to be delivered to host', () => {
      expect(getFileMetadataIndexName('foo', true)).toEqual('.fleet-fileds-tohost-meta-foo');
    });

    it('should generate file data index name for files to be delivered to host', () => {
      expect(getFileDataIndexName('foo', true)).toEqual('.fleet-fileds-tohost-data-foo');
    });
  });

  describe('getIntegrationNameFromIndexName()', () => {
    it.each([
      ['regular index names', '.fleet-fileds-fromhost-meta-agent'],
      ['datastream index names', '.ds-.fleet-fileds-fromhost-data-agent-2023.06.30-00001'],
    ])('should handle %s', (_, index) => {
      expect(getIntegrationNameFromIndexName(index, FILE_STORAGE_METADATA_INDEX_PATTERN)).toEqual(
        'agent'
      );
    });

    it.todo('should error if index pattern does not include `*`');
  });
});
