/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useStartServices, useKibanaVersion } from '../../../hooks';
import type { EnrollmentAPIKey } from '../../../types';

import { PlatformSelector } from './platform_selector';

interface Props {
  fleetServerHosts: string[];
  apiKey: EnrollmentAPIKey;
  policyId: string | undefined;
  isK8s: string | undefined;
}

function getfleetServerHostsEnrollArgs(apiKey: EnrollmentAPIKey, fleetServerHosts: string[]) {
  return `--url=${fleetServerHosts[0]} --enrollment-token=${apiKey.api_key}`;
}

export const ManualInstructions: React.FunctionComponent<Props> = ({
  apiKey,
  fleetServerHosts,
  policyId,
  isK8s,
}) => {
  const { docLinks } = useStartServices();
  const enrollArgs = getfleetServerHostsEnrollArgs(apiKey, fleetServerHosts);
  const kibanaVersion = useKibanaVersion();

  const linuxCommand = `curl -L -O https://artifacts.elastic.co/downloads/beats/elastic-agent/elastic-agent-${kibanaVersion}-linux-x86_64.tar.gz
tar xzvf elastic-agent-${kibanaVersion}-linux-x86_64.tar.gz
cd elastic-agent-${kibanaVersion}-linux-x86_64
sudo ./elastic-agent install ${enrollArgs}`;

  const macCommand = `curl -L -O https://artifacts.elastic.co/downloads/beats/elastic-agent/elastic-agent-${kibanaVersion}-darwin-x86_64.tar.gz
tar xzvf elastic-agent-${kibanaVersion}-darwin-x86_64.tar.gz
cd elastic-agent-${kibanaVersion}-darwin-x86_64
sudo ./elastic-agent install ${enrollArgs}`;

  const windowsCommand = `wget https://artifacts.elastic.co/downloads/beats/elastic-agent/elastic-agent-${kibanaVersion}-windows-x86_64.zip -OutFile elastic-agent-${kibanaVersion}-windows-x86_64.zip
Expand-Archive .\\elastic-agent-${kibanaVersion}-windows-x86_64.zip
cd elastic-agent-${kibanaVersion}-windows-x86_64
.\\elastic-agent.exe install ${enrollArgs}`;

  const linuxDebCommand = `curl -L -O https://artifacts.elastic.co/downloads/beats/elastic-agent/elastic-agent-${kibanaVersion}-amd64.deb
sudo dpkg -i elastic-agent-${kibanaVersion}-amd64.deb
sudo elastic-agent enroll ${enrollArgs} \nsudo systemctl enable elastic-agent \nsudo systemctl start elastic-agent`;

  const linuxRpmCommand = `curl -L -O https://artifacts.elastic.co/downloads/beats/elastic-agent/elastic-agent-${kibanaVersion}-x86_64.rpm
sudo rpm -vi elastic-agent-${kibanaVersion}-x86_64.rpm
sudo elastic-agent enroll ${enrollArgs} \nsudo systemctl enable elastic-agent \nsudo systemctl start elastic-agent`;

  return (
    <PlatformSelector
      linuxCommand={linuxCommand}
      macCommand={macCommand}
      windowsCommand={windowsCommand}
      linuxDebCommand={linuxDebCommand}
      linuxRpmCommand={linuxRpmCommand}
      troubleshootLink={docLinks.links.fleet.troubleshooting}
      isK8s={isK8s === 'IS_KUBERNETES'}
    />
  );
};
