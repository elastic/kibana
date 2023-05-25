/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConnectorMappingsAttributesPartialRt } from '../../../server/common/types/connector_mappings';
import { decodeOrThrow } from '../runtime_types';
import { ConnectorMappingsRt } from './mappings';

describe('mappings', () => {
  describe('ConnectorMappingsRt', () => {
    const defaultRequest = {
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

    it('has expected attributes in request', () => {
      const query = ConnectorMappingsRt.decode(defaultRequest);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('removes foo:bar attributes from request', () => {
      const query = ConnectorMappingsRt.decode({ ...defaultRequest, foo: 'bar' });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('removes foo:bar attributes from mappings', () => {
      const query = ConnectorMappingsRt.decode({
        ...defaultRequest,
        mappings: [{ ...defaultRequest.mappings[0], foo: 'bar' }],
      });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: { ...defaultRequest, mappings: [{ ...defaultRequest.mappings[0] }] },
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
