/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConnectorMappingsAttributesRT, ConnectorMappingsRt } from './mappings';

describe('Mappings', () => {
  describe('ConnectorMappingsAttributesRT', () => {
    const defaultRequest = {
      action_type: 'append',
      source: 'description',
      target: 'not_mapped',
    };

    it('has expected attributes in request', () => {
      const query = ConnectorMappingsAttributesRT.decode(defaultRequest);

      expect(query).toMatchObject({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('removes foo:bar attributes from request', () => {
      const query = ConnectorMappingsAttributesRT.decode({ ...defaultRequest, foo: 'bar' });

      expect(query).toMatchObject({
        _tag: 'Right',
        right: defaultRequest,
      });
    });
  });

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

      expect(query).toMatchObject({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('removes foo:bar attributes from request', () => {
      const query = ConnectorMappingsRt.decode({ ...defaultRequest, foo: 'bar' });

      expect(query).toMatchObject({
        _tag: 'Right',
        right: defaultRequest,
      });
    });
  });
});
