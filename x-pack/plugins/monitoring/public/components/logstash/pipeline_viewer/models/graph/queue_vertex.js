/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Vertex } from './vertex';
import queueIcon from '@elastic/eui/src/components/icon/assets/logstash_queue.svg';

export class QueueVertex extends Vertex {
  get typeString() {
    return 'queue';
  }

  get title() {
    return 'queue';
  }

  get icon() {
    return queueIcon;
  }

  get next() {
    return this.outgoingVertices;
  }
}
