/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  dataStreamPartsToIndexName,
  streamPartsToIndexPattern,
  indexNameToDataStreamParts,
} from './dataset_name';

describe('dataset_name', () => {
  describe('streamPartsToIndexPattern', () => {
    it('returns the correct index pattern', () => {
      expect(
        streamPartsToIndexPattern({
          typePattern: 'logs',
          datasetPattern: '*nginx.access*',
        })
      ).toEqual('logs-*nginx.access*');
    });
  });

  describe('dataStreamPartsToIndexName', () => {
    it('returns the correct index name', () => {
      expect(
        dataStreamPartsToIndexName({
          type: 'logs',
          dataset: 'nginx.access',
          namespace: 'default',
        })
      ).toEqual('logs-nginx.access-default');
    });
  });

  describe('indexNameToDataStreamParts', () => {
    it('returns the correct data stream name', () => {
      expect(indexNameToDataStreamParts('logs-nginx.access-default')).toEqual({
        type: 'logs',
        dataset: 'nginx.access',
        namespace: 'default',
      });
    });

    it('handles the case where the dataset name contains a hyphen', () => {
      expect(indexNameToDataStreamParts('logs-heartbeat-8-default')).toEqual({
        type: 'logs',
        dataset: 'heartbeat-8',
        namespace: 'default',
      });
    });
  });
});
