/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  OPEN_TELEMETRY_AGENT_NAMES,
  RUM_AGENT_NAMES,
} from '../../../../common/agent_name';
import { AgentName } from '../../../../typings/es_schemas/ui/fields/agent';
import dotNetIcon from './icons/dot-net.svg';
import goIcon from './icons/go.svg';
import javaIcon from './icons/java.svg';
import nodeJsIcon from './icons/nodejs.svg';
import openTelemetryIcon from './icons/opentelemetry.svg';
import phpIcon from './icons/php.svg';
import pythonIcon from './icons/python.svg';
import rubyIcon from './icons/ruby.svg';
import rumJsIcon from './icons/rumjs.svg';

const agentIcons: { [key: string]: string } = {
  dotnet: dotNetIcon,
  go: goIcon,
  java: javaIcon,
  nodejs: nodeJsIcon,
  opentelemetry: openTelemetryIcon,
  php: phpIcon,
  python: pythonIcon,
  ruby: rubyIcon,
  rum: rumJsIcon,
};

// This only needs to be exported for testing purposes, since we stub the SVG
// import values in test.
export function getAgentIconKey(agentName: string) {
  // Ignore case
  const lowercasedAgentName = agentName.toLowerCase();

  // RUM agent names
  if (RUM_AGENT_NAMES.includes(lowercasedAgentName as AgentName)) {
    return 'rum';
  }

  // Remove "opentelemetry/" prefix
  const agentNameWithoutPrefix = lowercasedAgentName.replace(
    /^opentelemetry\//,
    ''
  );

  if (Object.keys(agentIcons).includes(agentNameWithoutPrefix)) {
    return agentNameWithoutPrefix;
  }

  // OpenTelemetry-only agents
  if (OPEN_TELEMETRY_AGENT_NAMES.includes(lowercasedAgentName as AgentName)) {
    return 'opentelemetry';
  }
}

export function getAgentIcon(agentName?: string) {
  const key = agentName && getAgentIconKey(agentName);
  return key && agentIcons[key];
}
