/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConnectorMappingsAttributesRt, ConnectorMappingsRt } from './v1';

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

  const attributes = {
    mappings: [
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
    ],
    owner: 'cases',
  };

  describe('ConnectorMappingsRt', () => {
    it('has expected attributes in request', () => {
      const query = ConnectorMappingsRt.decode(mappings);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: mappings,
      });
    });

    it('removes foo:bar attributes from mappings', () => {
      const query = ConnectorMappingsRt.decode([
        { ...mappings[0] },
        {
          action_type: 'append',
          source: 'description',
          target: 'not_mapped',
          foo: 'bar',
        },
      ]);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: mappings,
      });
    });
  });

  describe('ConnectorMappingsAttributesRt', () => {
    it('has expected attributes in request', () => {
      const query = ConnectorMappingsAttributesRt.decode(attributes);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: attributes,
      });
    });

    it('removes foo:bar attributes from request', () => {
      const query = ConnectorMappingsAttributesRt.decode({ ...attributes, foo: 'bar' });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: attributes,
      });
    });

    it('removes foo:bar attributes from mappings', () => {
      const query = ConnectorMappingsAttributesRt.decode({
        ...attributes,
        mappings: [{ ...attributes.mappings[0], foo: 'bar' }],
      });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: { ...attributes, mappings: [{ ...attributes.mappings[0] }] },
      });
    });
  });
});
