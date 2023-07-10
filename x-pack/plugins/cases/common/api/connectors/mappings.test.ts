/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConnectorMappingsAttributesPartialRt } from '../../../server/common/types/connector_mappings';
import { decodeOrThrow } from '../runtime_types';
import { ConnectorMappingsAttributesRt, ConnectorMappingsRt } from './mappings';

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

  describe('ConnectorMappingsAttributesPartialRt', () => {
    it('strips excess fields from the object', () => {
      const res = decodeOrThrow(ConnectorMappingsAttributesPartialRt)({
        bananas: 'yes',
        owner: 'hi',
      });
      expect(res).toMatchObject({
        owner: 'hi',
      });
    });

    it('does not throw when the object is empty', () => {
      expect(() => decodeOrThrow(ConnectorMappingsAttributesPartialRt)({})).not.toThrow();
    });
  });
});
