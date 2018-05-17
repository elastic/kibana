/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Statement } from './statement';
import { makeStatement } from './make_statement';
import { isVertexPipelineStage } from './utils';
import { IfElement } from '../list/if_element';
import { ElseElement } from '../list/else_element';

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

  flatten(depth, parentId) {
    const list = [];

    list.push(new IfElement(this, depth, parentId));

    this.trueStatements.forEach(trueStatement => {
      list.push(trueStatement.flatten(depth + 1, this.id));
    });

    if (this.elseStatements.length) {
      const elseElement = new ElseElement(this, depth, parentId);
      list.push(elseElement);
      this.elseStatements.forEach(elseStatement => {
        list.push(elseStatement.flatten(depth + 1, elseElement.id));
      });
    }

    return list;
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
