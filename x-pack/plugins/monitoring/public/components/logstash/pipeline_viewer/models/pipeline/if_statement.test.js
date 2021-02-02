/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IfStatement } from './if_statement';
import { PluginVertex } from '../graph/plugin_vertex';
import { IfElement } from '../list/if_element';
import { PluginElement } from '../list/plugin_element';

describe('IfStatement class', () => {
  let ifVertex;
  let meta;
  let pipelineStage;

  describe('Statement from if vertex', () => {
    beforeEach(() => {
      meta = {
        source: {
          id: 'pipeline',
          column: 10,
          line: 17,
          protocol: 'str',
        },
      };

      ifVertex = {
        id: '0aef421',
        hasExplicitId: false,
        name: '[is_rt] == "RT"',
        stats: {},
        meta,
      };
      pipelineStage = 'output';
    });

    describe('with one true statement, no false statements', () => {
      beforeEach(() => {
        // output {
        //   if (...) {
        //     elasticsearch {
        //       id => es_output
        //     }
        //   }
        // }

        const esVertex = new PluginVertex({ edgesByFrom: {} }, { id: 'es_output' });
        esVertex.pipelineStage = 'output';

        ifVertex.trueOutgoingVertex = esVertex;
        ifVertex.trueOutgoingVertices = [esVertex];
        ifVertex.falseOutgoingVertices = [];
      });

      it('creates a IfStatement from vertex props', () => {
        const ifStatement = IfStatement.fromPipelineGraphVertex(ifVertex, pipelineStage);

        expect(ifStatement.id).toBe('0aef421');
        expect(ifStatement.hasExplicitId).toBe(false);
        expect(ifStatement.stats).toEqual({});
        expect(ifStatement.meta).toBe(meta);
        expect(ifStatement.condition).toBe('[is_rt] == "RT"');
        expect(ifStatement.trueStatements).toBeInstanceOf(Array);
        expect(ifStatement.trueStatements.length).toBe(1);
        expect(ifStatement.elseStatements).toBeInstanceOf(Array);
        expect(ifStatement.elseStatements.length).toBe(0);
        expect(ifStatement.vertex).toEqual(ifVertex);
      });
    });

    describe('with one true statement, one else statement', () => {
      beforeEach(() => {
        // output {
        //   if (...) {
        //     elasticsearch {
        //       id => es_output
        //     }
        //   } else {
        //     stdout {
        //       id => terminal
        //   }
        // }

        const esVertex = new PluginVertex({ edgesByFrom: {} }, { id: 'es_output' });
        esVertex.pipelineStage = 'output';

        const terminalVertex = new PluginVertex({ edgesByFrom: {} }, { id: 'terminal' });
        terminalVertex.pipelineStage = 'output';

        ifVertex.trueOutgoingVertex = esVertex;
        ifVertex.falseOutgoingVertex = terminalVertex;

        ifVertex.trueOutgoingVertices = [esVertex];
        ifVertex.falseOutgoingVertices = [terminalVertex];
      });

      it('creates a IfStatement from vertex props', () => {
        const ifStatement = IfStatement.fromPipelineGraphVertex(ifVertex, pipelineStage);

        expect(ifStatement.id).toBe('0aef421');
        expect(ifStatement.hasExplicitId).toBe(false);
        expect(ifStatement.stats).toEqual({});
        expect(ifStatement.meta).toBe(meta);
        expect(ifStatement.condition).toBe('[is_rt] == "RT"');
        expect(ifStatement.trueStatements).toBeInstanceOf(Array);
        expect(ifStatement.trueStatements.length).toBe(1);
        expect(ifStatement.elseStatements).toBeInstanceOf(Array);
        expect(ifStatement.elseStatements.length).toBe(1);
        expect(ifStatement.vertex).toEqual(ifVertex);
      });
    });

    describe('with two true statements, no false statements', () => {
      beforeEach(() => {
        // output {
        //   if (...) {
        //     elasticsearch {
        //       id => es_output
        //     }
        //     s3 {
        //       id => s3_output
        //     }
        //   }
        // }

        const s3Vertex = new PluginVertex({ edgesByFrom: {} }, { id: 's3_output' });
        s3Vertex.pipelineStage = 'output';

        const esVertex = new PluginVertex(
          { edgesByFrom: { es_output: [{ to: s3Vertex }] } },
          { id: 'es_output' }
        );
        esVertex.pipelineStage = 'output';

        ifVertex.trueOutgoingVertex = esVertex;
        ifVertex.trueOutgoingVertices = [esVertex];
        ifVertex.falseOutgoingVertices = [];
      });

      it('creates a IfStatement from vertex props', () => {
        const ifStatement = IfStatement.fromPipelineGraphVertex(ifVertex, pipelineStage);

        expect(ifStatement.id).toBe('0aef421');
        expect(ifStatement.hasExplicitId).toBe(false);
        expect(ifStatement.stats).toEqual({});
        expect(ifStatement.meta).toBe(meta);
        expect(ifStatement.condition).toBe('[is_rt] == "RT"');
        expect(ifStatement.trueStatements).toBeInstanceOf(Array);
        expect(ifStatement.trueStatements.length).toBe(2);
        expect(ifStatement.elseStatements).toBeInstanceOf(Array);
        expect(ifStatement.elseStatements.length).toBe(0);
        expect(ifStatement.vertex).toEqual(ifVertex);
      });
    });

    describe('with one true statement, two else statements', () => {
      beforeEach(() => {
        // output {
        //   if (...) {
        //     elasticsearch {
        //       id => es_output
        //     }
        //   } else {
        //     stdout {
        //       id => terminal
        //     s3 {
        //       id => s3_output
        //     }
        //   }
        // }

        const esVertex = new PluginVertex({ edgesByFrom: {} }, { id: 'es_output' });
        esVertex.pipelineStage = 'output';

        const s3Vertex = new PluginVertex({ edgesByFrom: {} }, { id: 's3_output' });
        s3Vertex.pipelineStage = 'output';

        const terminalVertex = new PluginVertex(
          { edgesByFrom: { terminal: [{ to: s3Vertex }] } },
          { id: 'terminal' }
        );
        terminalVertex.pipelineStage = 'output';

        ifVertex.trueOutgoingVertex = esVertex;
        ifVertex.falseOutgoingVertex = terminalVertex;

        ifVertex.trueOutgoingVertices = [esVertex];
        ifVertex.falseOutgoingVertices = [terminalVertex];
      });

      it('creates a IfStatement from vertex props', () => {
        const ifStatement = IfStatement.fromPipelineGraphVertex(ifVertex, pipelineStage);

        expect(ifStatement.id).toBe('0aef421');
        expect(ifStatement.hasExplicitId).toBe(false);
        expect(ifStatement.stats).toEqual({});
        expect(ifStatement.meta).toBe(meta);
        expect(ifStatement.condition).toBe('[is_rt] == "RT"');
        expect(ifStatement.trueStatements).toBeInstanceOf(Array);
        expect(ifStatement.trueStatements.length).toBe(1);
        expect(ifStatement.elseStatements).toBeInstanceOf(Array);
        expect(ifStatement.elseStatements.length).toBe(2);
        expect(ifStatement.vertex).toEqual(ifVertex);
      });
    });

    describe('toList', () => {
      beforeEach(() => {
        const esVertex = new PluginVertex({ edgesByFrom: {} }, { id: 'es_output' });
        esVertex.pipelineStage = 'output';

        ifVertex.trueOutgoingVertices = [esVertex];
        ifVertex.falseOutgoingVertices = [];
      });

      it('creates list and sub-list for nested statements', () => {
        const ifStatement = IfStatement.fromPipelineGraphVertex(ifVertex, pipelineStage);

        const result = ifStatement.toList(0, 'output');

        expect(result).toBeInstanceOf(Array);
        expect(result.length).toBe(2);
        expect(result[0]).toBeInstanceOf(IfElement);
        expect(result[0].id).toBe('0aef421');
        expect(result[1]).toBeInstanceOf(PluginElement);
        const plugin = result[1];
        expect(plugin).toBeInstanceOf(PluginElement);
        expect(plugin.id).toBe('es_output');
      });
    });
  });
});
