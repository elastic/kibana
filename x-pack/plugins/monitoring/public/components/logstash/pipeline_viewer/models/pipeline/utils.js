/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export function isVertexPipelineStage(vertex, pipelineStage) {
  return vertex && vertex.pipelineStage === pipelineStage;
}

export function addVertices(statements, verticesToAdd, pipelineStage, makeStatement) {
  if (!verticesToAdd) { return; }

  verticesToAdd.forEach(vertex => {
    if (isVertexPipelineStage(vertex, pipelineStage)) {
      statements.push(makeStatement(vertex, pipelineStage));
    }
  });
}
