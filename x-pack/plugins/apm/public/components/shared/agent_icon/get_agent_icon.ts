/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  isIosAgentName,
  isRumAgentName,
  isJavaAgentName,
  OPEN_TELEMETRY_AGENT_NAMES,
} from '../../../../common/agent_name';
import { AgentName } from '../../../../typings/es_schemas/ui/fields/agent';
import defaultIcon from '../span_icon/icons/default.svg';
import dotNetIcon from './icons/dot_net.svg';
import erlangIcon from './icons/erlang.svg';
import goIcon from './icons/go.svg';
import iosIcon from './icons/ios.svg';
import darkIosIcon from './icons/ios_dark.svg';
import javaIcon from './icons/java.svg';
import lambdaIcon from './icons/lambda.svg';
import nodeJsIcon from './icons/nodejs.svg';
import ocamlIcon from './icons/ocaml.svg';
import openTelemetryIcon from './icons/opentelemetry.svg';
import phpIcon from './icons/php.svg';
import pythonIcon from './icons/python.svg';
import rubyIcon from './icons/ruby.svg';
import rumJsIcon from './icons/rumjs.svg';
import darkPhpIcon from './icons/php_dark.svg';
import darkRumJsIcon from './icons/rumjs_dark.svg';
import rustIcon from './icons/rust.svg';
import darkRustIcon from './icons/rust_dark.svg';

const agentIcons: { [key: string]: string } = {
  dotnet: dotNetIcon,
  erlang: erlangIcon,
  go: goIcon,
  ios: iosIcon,
  java: javaIcon,
  lambda: lambdaIcon,
  nodejs: nodeJsIcon,
  ocaml: ocamlIcon,
  opentelemetry: openTelemetryIcon,
  php: phpIcon,
  python: pythonIcon,
  ruby: rubyIcon,
  rum: rumJsIcon,
  rust: rustIcon,
};

const darkAgentIcons: { [key: string]: string } = {
  ...agentIcons,
  ios: darkIosIcon,
  php: darkPhpIcon,
  rum: darkRumJsIcon,
  rust: darkRustIcon,
};

// This only needs to be exported for testing purposes, since we stub the SVG
// import values in test.
export function getAgentIconKey(agentName: string) {
  // Ignore case
  const lowercasedAgentName = agentName.toLowerCase();

  // RUM agent names
  if (isRumAgentName(lowercasedAgentName)) {
    return 'rum';
  }

  // Java  agent names
  if (isJavaAgentName(lowercasedAgentName)) {
    return 'java';
  }

  if (isIosAgentName(lowercasedAgentName)) {
    return 'ios';
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

export function getAgentIcon(
  agentName: string | undefined,
  isDarkMode: boolean
) {
  const key = agentName && getAgentIconKey(agentName);
  if (!key) {
    return defaultIcon;
  }
  return (isDarkMode ? darkAgentIcons[key] : agentIcons[key]) ?? defaultIcon;
}
