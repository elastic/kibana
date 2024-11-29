/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export function getProcessingPipelineName(id: string) {
  return `${id}@stream.processing`;
}

export function getReroutePipelineName(id: string) {
  return `${id}@stream.reroutes`;
}

export function getClassicPipelineName(id: string) {
  return `${id}@stream`;
}
