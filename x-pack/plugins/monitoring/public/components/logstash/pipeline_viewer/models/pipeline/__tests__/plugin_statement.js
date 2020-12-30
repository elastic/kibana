/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
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
          password: 'password',
        },
      };
      pluginVertex = {
        id: 'es_output',
        hasExplicitId: true,
        stats: {},
        meta,
        pluginType: 'output',
        name: 'elasticsearch',
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
      expect(pluginStatement.vertex).to.eql(pluginVertex);
    });
  });

  describe('toList', () => {
    it('creates a list with plugin statement in it', () => {
      const pluginStatement = PluginStatement.fromPipelineGraphVertex(pluginVertex);

      const result = pluginStatement.toList();
      expect(result.length).to.be(1);
      expect(result[0].id).to.be('es_output');
    });
  });
});
