/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConnectorMappingResponseRt } from './v1';

describe('mappings', () => {
  const mappings = [
    {
      action_type: 'overwrite',
      source: 'title',
      target: 'unknown',
    },
    {
      action_type: 'append',
      source: 'description',
      target: 'not_mapped',
    },
  ];

  describe('ConnectorMappingResponseRt', () => {
    it('has expected attributes in response', () => {
      const query = ConnectorMappingResponseRt.decode({ id: 'test', version: 'test', mappings });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: { id: 'test', version: 'test', mappings },
      });
    });

    it('removes foo:bar attributes from the response', () => {
      const query = ConnectorMappingResponseRt.decode({
        id: 'test',
        version: 'test',
        mappings: [
          { ...mappings[0] },
          {
            action_type: 'append',
            source: 'description',
            target: 'not_mapped',
            foo: 'bar',
          },
        ],
        foo: 'bar',
      });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: { id: 'test', version: 'test', mappings },
      });
    });

    it('removes foo:bar attributes from the mappings', () => {
      const query = ConnectorMappingResponseRt.decode({
        id: 'test',
        version: 'test',
        mappings,
        foo: 'bar',
      });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: { id: 'test', version: 'test', mappings },
      });
    });
  });
});
