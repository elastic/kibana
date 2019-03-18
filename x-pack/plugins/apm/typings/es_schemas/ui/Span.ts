/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SpanRaw } from '../raw/SpanRaw';
import { Agent } from './fields/Agent';

export interface Span extends SpanRaw {
  agent: Agent;
}
