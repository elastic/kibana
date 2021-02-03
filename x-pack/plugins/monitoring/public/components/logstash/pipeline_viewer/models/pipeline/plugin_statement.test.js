/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PluginStatement } from './plugin_statement';

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

      expect(pluginStatement.id).toBe('es_output');
      expect(pluginStatement.hasExplicitId).toBe(true);
      expect(pluginStatement.stats).toEqual({});
      expect(pluginStatement.meta).toBe(meta);
      expect(pluginStatement.pluginType).toBe('output');
      expect(pluginStatement.name).toBe('elasticsearch');
      expect(pluginStatement.vertex).toEqual(pluginVertex);
    });
  });

  describe('toList', () => {
    it('creates a list with plugin statement in it', () => {
      const pluginStatement = PluginStatement.fromPipelineGraphVertex(pluginVertex);

      const result = pluginStatement.toList();
      expect(result.length).toBe(1);
      expect(result[0].id).toBe('es_output');
    });
  });
});
