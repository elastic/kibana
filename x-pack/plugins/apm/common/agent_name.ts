/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*
 * Agent names can be any string. This list only defines the official agents
 * that we might want to target specifically eg. linking to their documentation
 * & telemetry reporting. Support additional agent types by appending
 * definitions in mappings.json (for telemetry), the AgentName type, and the
 * agentNames Set.
 */
import { AgentName } from '../typings/es_schemas/fields/AgentName';

const agentNames: { [key: string]: AgentName } = {
  PYTHON: 'python',
  JAVA: 'java',
  NODEJS: 'nodejs',
  JS_BASE: 'js-base',
  RUM_JS: 'rum-js',
  RUBY: 'ruby',
  GO: 'go'
};

export function isAgentName(agentName: string): boolean {
  return Object.values(agentNames).includes(agentName as AgentName);
}

export function isRumAgentName(agentName: string): boolean {
  return [agentNames.JS_BASE, agentNames.RUM_JS].includes(
    agentName as AgentName
  );
}
