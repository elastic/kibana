/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';
import { IfStatement } from '../if_statement';
import { PluginVertex } from '../../graph/plugin_vertex';

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
          protocol: 'str'
        }
      };

      ifVertex = {
        id: '0aef421',
        hasExplicitId: false,
        name: '[is_rt] == "RT"',
        stats: {},
        meta
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
      });

      it('creates a IfStatement from vertex props', () => {
        const ifStatement = IfStatement.fromPipelineGraphVertex(ifVertex, pipelineStage);

        expect(ifStatement.id).to.be('0aef421');
        expect(ifStatement.hasExplicitId).to.be(false);
        expect(ifStatement.stats).to.eql({});
        expect(ifStatement.meta).to.be(meta);
        expect(ifStatement.condition).to.be('[is_rt] == "RT"');
        expect(ifStatement.trueStatements).to.be.an(Array);
        expect(ifStatement.trueStatements.length).to.be(1);
        expect(ifStatement.elseStatements).to.be.an(Array);
        expect(ifStatement.elseStatements.length).to.be(0);
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
      });

      it('creates a IfStatement from vertex props', () => {
        const ifStatement = IfStatement.fromPipelineGraphVertex(ifVertex, pipelineStage);

        expect(ifStatement.id).to.be('0aef421');
        expect(ifStatement.hasExplicitId).to.be(false);
        expect(ifStatement.stats).to.eql({});
        expect(ifStatement.meta).to.be(meta);
        expect(ifStatement.condition).to.be('[is_rt] == "RT"');
        expect(ifStatement.trueStatements).to.be.an(Array);
        expect(ifStatement.trueStatements.length).to.be(1);
        expect(ifStatement.elseStatements).to.be.an(Array);
        expect(ifStatement.elseStatements.length).to.be(1);
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

        const s3Vertex = new PluginVertex({ edgesByFrom: {}, }, { id: 's3_output' });
        s3Vertex.pipelineStage = 'output';

        const esVertex = new PluginVertex({ edgesByFrom: { es_output: [ { to: s3Vertex } ] } }, { id: 'es_output' });
        esVertex.pipelineStage = 'output';

        ifVertex.trueOutgoingVertex = esVertex;
      });

      it('creates a IfStatement from vertex props', () => {
        const ifStatement = IfStatement.fromPipelineGraphVertex(ifVertex, pipelineStage);

        expect(ifStatement.id).to.be('0aef421');
        expect(ifStatement.hasExplicitId).to.be(false);
        expect(ifStatement.stats).to.eql({});
        expect(ifStatement.meta).to.be(meta);
        expect(ifStatement.condition).to.be('[is_rt] == "RT"');
        expect(ifStatement.trueStatements).to.be.an(Array);
        expect(ifStatement.trueStatements.length).to.be(2);
        expect(ifStatement.elseStatements).to.be.an(Array);
        expect(ifStatement.elseStatements.length).to.be(0);
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

        const s3Vertex = new PluginVertex({ edgesByFrom: {}, }, { id: 's3_output' });
        s3Vertex.pipelineStage = 'output';

        const terminalVertex = new PluginVertex({ edgesByFrom: { terminal: [ { to: s3Vertex } ] } }, { id: 'terminal' });
        terminalVertex.pipelineStage = 'output';

        ifVertex.trueOutgoingVertex = esVertex;
        ifVertex.falseOutgoingVertex = terminalVertex;
      });

      it('creates a IfStatement from vertex props', () => {
        const ifStatement = IfStatement.fromPipelineGraphVertex(ifVertex, pipelineStage);

        expect(ifStatement.id).to.be('0aef421');
        expect(ifStatement.hasExplicitId).to.be(false);
        expect(ifStatement.stats).to.eql({});
        expect(ifStatement.meta).to.be(meta);
        expect(ifStatement.condition).to.be('[is_rt] == "RT"');
        expect(ifStatement.trueStatements).to.be.an(Array);
        expect(ifStatement.trueStatements.length).to.be(1);
        expect(ifStatement.elseStatements).to.be.an(Array);
        expect(ifStatement.elseStatements.length).to.be(2);
      });
    });
  });
});
