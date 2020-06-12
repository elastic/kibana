/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export class Element {
  constructor(id, statement, depth, parentId) {
    this.id = id;
    this.statement = statement;
    this.depth = depth;
    this.parentId = parentId;
  }
}
