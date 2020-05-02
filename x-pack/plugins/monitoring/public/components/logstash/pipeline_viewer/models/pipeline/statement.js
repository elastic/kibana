/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export class Statement {
  constructor(vertex) {
    const { id, hasExplicitId, stats, meta } = vertex;

    this.id = id;
    this.hasExplicitId = hasExplicitId;
    this.stats = stats;
    this.meta = meta;

    // storing a direct reference to the source vertex is convenient
    // for interoperability with components that use the existing graph
    this.vertex = vertex;
  }
}
