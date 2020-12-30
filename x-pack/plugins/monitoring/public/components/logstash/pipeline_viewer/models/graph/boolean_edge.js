/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Edge } from './edge';

export class BooleanEdge extends Edge {
  get when() {
    return this.json.when;
  }

  get isTrue() {
    return this.when === true;
  }

  get isFalse() {
    return this.when === false;
  }
}
