/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export class Statement {
  constructor(id, hasExplicitId, stats, meta) {
    this.id = id;
    this.hasExplicitId = hasExplicitId;
    this.stats = stats;
    this.meta = meta;
  }
}
