/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Statement } from './statement';
import { makeStatement } from './make_statement';
import { isVertexPipelineStage } from './utils';

export class IfStatement extends Statement {
  constructor(id, hasExplicitId, stats, meta, condition, trueStatements, elseStatements) {
    super(id, hasExplicitId, stats, meta);

    this.condition = condition;
    this.trueStatements = trueStatements;
    this.elseStatements = elseStatements;
  }

  static fromPipelineGraphVertex(ifVertex, pipelineStage) {
    const trueStatements = [];
    const elseStatements = [];

    const trueVertex = ifVertex.trueOutgoingVertex;
    const falseVertex = ifVertex.falseOutgoingVertex;
    const next = ifVertex.next;

    let currentVertex = trueVertex;
    while (isVertexPipelineStage(currentVertex, pipelineStage) && (currentVertex !== next)) {
      trueStatements.push(makeStatement(currentVertex, pipelineStage));
      currentVertex = currentVertex.next;
    }

    currentVertex = falseVertex;
    while (currentVertex && isVertexPipelineStage(currentVertex, pipelineStage) && (currentVertex !== next)) {
      elseStatements.push(makeStatement(currentVertex, pipelineStage));
      currentVertex = currentVertex.next;
    }

    return new IfStatement(
      ifVertex.id,
      ifVertex.hasExplicitId,
      ifVertex.stats,
      ifVertex.meta,
      ifVertex.name,
      trueStatements,
      elseStatements
    );
  }
}
