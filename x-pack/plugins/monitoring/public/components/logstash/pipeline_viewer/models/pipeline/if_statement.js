/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Statement } from './statement';
import { makeStatement } from './make_statement';
import { isVertexPipelineStage } from './utils';

function makeStatementsForOutgoingVertices(outgoingVertices, statements, next, pipelineStage) {
  outgoingVertices.forEach(vertex => {
    let currentVertex = vertex;
    while(isVertexPipelineStage(currentVertex, pipelineStage) && (currentVertex !== next)) {
      statements.push(makeStatement(currentVertex, pipelineStage));
      currentVertex = currentVertex.next;
    }
  });
}

export class IfStatement extends Statement {
  constructor(vertex, trueStatements, elseStatements) {
    super(vertex);

    const { name } = vertex;

    this.condition = name;
    this.trueStatements = trueStatements;
    this.elseStatements = elseStatements;
  }

  static fromPipelineGraphVertex(ifVertex, pipelineStage) {
    const trueStatements = [];
    const elseStatements = [];
    const {
      trueOutgoingVertices,
      falseOutgoingVertices
    } = ifVertex;

    const next = ifVertex.next;

    makeStatementsForOutgoingVertices(trueOutgoingVertices, trueStatements, next, pipelineStage);
    makeStatementsForOutgoingVertices(falseOutgoingVertices, elseStatements, next, pipelineStage);

    return new IfStatement(
      ifVertex,
      trueStatements,
      elseStatements
    );
  }
}
