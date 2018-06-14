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

function addStatementsToList(list, statements, depth, id) {
  statements.forEach(statement => {
    list.push(...statement.toList(depth, id));
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

  toList(depth, parentId) {
    const list = [];

    const ifElement = new IfElement(this, depth, parentId);
    list.push(ifElement);

    this.trueStatements.forEach(trueStatement => {
      list.push(...trueStatement.toList(depth + 1, this.id));
    });

    if (this.elseStatements.length) {
      const elseElement = new ElseElement(this, depth, parentId);
      list.push(elseElement);

      this.elseStatements.forEach(elseStatement => {
        list.push(...elseStatement.toList(depth + 1, elseElement.id));
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
