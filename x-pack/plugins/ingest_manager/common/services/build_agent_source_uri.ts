/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// given the agent and a version, get the appropriate source URI to handle agent upgrades
import { Agent } from '../types';

export function buildAgentSourceUri(agent: Agent, version: string) {
  return `http://path/to/download/${version}`;
}
