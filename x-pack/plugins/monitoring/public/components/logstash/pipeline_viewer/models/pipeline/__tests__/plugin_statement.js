/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';
import { PluginStatement } from '../plugin_statement';

describe('PluginStatement class', () => {
  let pluginVertex;
  let meta;

  describe('Statement from plugin vertex', () => {
    beforeEach(() => {
      meta = {
        source: {
          id: 'output',
          user: 'user',
          password: 'password'
        }
      };
      pluginVertex = {
        id: 'es_output',
        hasExplicitId: true,
        stats: {},
        meta,
        pluginType: 'output',
        name: 'elasticsearch'
      };
    });

    it('creates a PluginStatement from vertex props', () => {
      const pluginStatement = PluginStatement.fromPipelineGraphVertex(pluginVertex);

      expect(pluginStatement.id).to.be('es_output');
      expect(pluginStatement.hasExplicitId).to.be(true);
      expect(pluginStatement.stats).to.eql({});
      expect(pluginStatement.meta).to.be(meta);
      expect(pluginStatement.pluginType).to.be('output');
      expect(pluginStatement.name).to.be('elasticsearch');
    });
  });
});
