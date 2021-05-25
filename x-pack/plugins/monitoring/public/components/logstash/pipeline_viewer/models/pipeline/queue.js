/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Statement } from './statement';

export class Queue extends Statement {
  static fromPipelineGraphVertex(queueVertex) {
    return new Queue(queueVertex);
  }
}
