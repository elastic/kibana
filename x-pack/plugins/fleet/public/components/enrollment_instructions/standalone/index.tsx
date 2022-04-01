/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { CommandsByPlatform } from '../../../applications/fleet/sections/agents/agent_requirements_page/components/install_command_utils';

export type InstructionsType = 'IS_LOADING' | 'IS_KUBERNETES' | 'IS_NOT_KUBERNETES';

export const StandaloneInstructions = (
  kibanaVersion: string,
  isK8s: InstructionsType
): CommandsByPlatform => {
  const KUBERNETES_RUN_INSTRUCTIONS = 'kubectl apply -f elastic-agent-standalone-kubernetes.yaml';

  const STANDALONE_RUN_INSTRUCTIONS_LINUX = `curl -L -O https://artifacts.elastic.co/downloads/beats/elastic-agent/elastic-agent-${kibanaVersion}-linux-x86_64.tar.gz
  tar xzvf elastic-agent-${kibanaVersion}-linux-x86_64.tar.gz
  sudo ./elastic-agent install`;

  const STANDALONE_RUN_INSTRUCTIONS_MAC = `curl -L -O https://artifacts.elastic.co/downloads/beats/elastic-agent/elastic-agent-${kibanaVersion}-darwin-x86_64.tar.gz
  tar xzvf elastic-agent-${kibanaVersion}-darwin-x86_64.tar.gz
  sudo ./elastic-agent install`;

  const STANDALONE_RUN_INSTRUCTIONS_WINDOWS = `wget https://artifacts.elastic.co/downloads/beats/elastic-agent/elastic-agent-${kibanaVersion}-windows-x86_64.zip -OutFile elastic-agent-${kibanaVersion}-windows-x86_64.zip
  Expand-Archive .\elastic-agent-${kibanaVersion}-windows-x86_64.zip
  .\\elastic-agent.exe install`;

  const linuxDebCommand = `curl -L -O https://artifacts.elastic.co/downloads/beats/elastic-agent/elastic-agent-${kibanaVersion}-amd64.deb
  sudo dpkg -i elastic-agent-${kibanaVersion}-amd64.deb \nsudo systemctl enable elastic-agent \nsudo systemctl start elastic-agent`;

  const linuxRpmCommand = `curl -L -O https://artifacts.elastic.co/downloads/beats/elastic-agent/elastic-agent-${kibanaVersion}-x86_64.rpm
  sudo rpm -vi elastic-agent-${kibanaVersion}-x86_64.rpm \nsudo systemctl enable elastic-agent \nsudo systemctl start elastic-agent`;

  const linuxCommand =
    isK8s === 'IS_KUBERNETES' ? KUBERNETES_RUN_INSTRUCTIONS : STANDALONE_RUN_INSTRUCTIONS_LINUX;
  const macCommand =
    isK8s === 'IS_KUBERNETES' ? KUBERNETES_RUN_INSTRUCTIONS : STANDALONE_RUN_INSTRUCTIONS_MAC;
  const windowsCommand =
    isK8s === 'IS_KUBERNETES' ? KUBERNETES_RUN_INSTRUCTIONS : STANDALONE_RUN_INSTRUCTIONS_WINDOWS;

  return {
    linux: linuxCommand,
    mac: macCommand,
    windows: windowsCommand,
    deb: linuxDebCommand,
    rpm: linuxRpmCommand,
  };
};
