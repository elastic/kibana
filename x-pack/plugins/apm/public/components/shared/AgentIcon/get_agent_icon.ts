/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getNormalizedAgentName } from '../../../../common/agent_name';
import dotNetIcon from './icons/dot-net.svg';
import goIcon from './icons/go.svg';
import javaIcon from './icons/java.svg';
import nodeJsIcon from './icons/nodejs.svg';
import phpIcon from './icons/php.svg';
import pythonIcon from './icons/python.svg';
import rubyIcon from './icons/ruby.svg';
import rumJsIcon from './icons/rumjs.svg';

const agentIcons: { [key: string]: string } = {
  dotnet: dotNetIcon,
  go: goIcon,
  java: javaIcon,
  'js-base': rumJsIcon,
  nodejs: nodeJsIcon,
  php: phpIcon,
  python: pythonIcon,
  ruby: rubyIcon,
};

export function getAgentIcon(agentName?: string) {
  const normalizedAgentName = getNormalizedAgentName(agentName);
  return normalizedAgentName && agentIcons[normalizedAgentName];
}
