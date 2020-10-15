/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Vertex } from './vertex';

export class QueueVertex extends Vertex {
  get typeString() {
    return 'queue';
  }

  get title() {
    return 'queue';
  }

  get iconType() {
    return 'logstashQueue';
  }

  get next() {
    return this.outgoingVertices;
  }
}
