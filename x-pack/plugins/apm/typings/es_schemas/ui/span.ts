/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SpanRaw } from '../raw/span_raw';
import { Agent } from './fields/agent';

export interface Span extends SpanRaw {
  agent: Agent;
}
