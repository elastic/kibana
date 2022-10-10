/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getSortForThreatList } from './get_threat_list';

describe('get_threat_signals', () => {
  describe('getSortForThreatList', () => {
    test('it should return _shard_doc and timestamp by default', () => {
      const sortOrder = getSortForThreatList({
        index: [],
        listItemIndex: '',
      });
      expect(sortOrder).toEqual(['_shard_doc', { '@timestamp': 'asc' }]);
    });

    test('it should return _shard_doc and timestamp if it is not value list', () => {
      const sortOrder = getSortForThreatList({
        index: ['source-index'],
        listItemIndex: 'list-index',
      });
      expect(sortOrder).toEqual(['_shard_doc', { '@timestamp': 'asc' }]);
    });

    test('it should return only _shard_doc if it is value list', () => {
      const sortOrder = getSortForThreatList({
        index: ['list-index'],
        listItemIndex: 'list-index',
      });
      expect(sortOrder).toEqual(['_shard_doc']);
    });
  });
});
