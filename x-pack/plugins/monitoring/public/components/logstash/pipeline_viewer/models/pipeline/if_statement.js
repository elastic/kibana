/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { pull } from 'lodash';

import { Statement } from './statement';
import { makeStatement } from './make_statement';
import {
  addVertices,
  isVertexPipelineStage
} from './utils';

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
    const trueVertices = ifVertex.trueOutgoingVertices;
    const elseVertices = ifVertex.falseOutgoingVertices;
    const trueVertex = ifVertex.trueOutgoingVertex;
    const falseVertex = ifVertex.falseOutgoingVertex;
    const next = ifVertex.next;

    let currentVertex = trueVertex;
    while (isVertexPipelineStage(currentVertex, pipelineStage) && (currentVertex !== next)) {
      pull(trueVertices, currentVertex);
      trueStatements.push(makeStatement(currentVertex, pipelineStage));
      currentVertex = currentVertex.next;
    }

    currentVertex = falseVertex;
    while (currentVertex && isVertexPipelineStage(currentVertex, pipelineStage) && (currentVertex !== next)) {
      pull(elseVertices, currentVertex);
      elseStatements.push(makeStatement(currentVertex, pipelineStage));
      currentVertex = currentVertex.next;
    }

    addVertices(trueStatements, trueVertices, pipelineStage);
    addVertices(elseStatements, elseVertices, pipelineStage);

    return new IfStatement(
      ifVertex,
      trueStatements,
      elseStatements
    );
  }
}
