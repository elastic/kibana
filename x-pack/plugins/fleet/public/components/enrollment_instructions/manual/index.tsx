/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FleetProxy } from '../../../types';

function getfleetServerHostsEnrollArgs(
  apiKey: string,
  fleetServerHosts: string[],
  fleetProxy?: FleetProxy
) {
  const proxyHeadersArgs = fleetProxy?.proxy_headers
    ? Object.entries(fleetProxy.proxy_headers).reduce((acc, [proxyKey, proyVal]) => {
        acc += ` --proxy-header ${proxyKey}=${proyVal}`;

        return acc;
      }, '')
    : '';
  const proxyArgs = fleetProxy ? ` --proxy-url=${fleetProxy.url}${proxyHeadersArgs}` : '';
  return `--url=${fleetServerHosts[0]} --enrollment-token=${apiKey}${proxyArgs}`;
}

export const ManualInstructions = ({
  apiKey,
  fleetServerHosts,
  fleetProxy,
  agentVersion: agentVersion,
  gcpProjectId = '<PROJECT_ID>',
  gcpOrganizationId = '<ORGANIZATION_ID>',
  gcpAccountType,
}: {
  apiKey: string;
  fleetServerHosts: string[];
  fleetProxy?: FleetProxy;
  agentVersion: string;
  gcpProjectId?: string;
  gcpOrganizationId?: string;
  gcpAccountType?: string;
}) => {
  const enrollArgs = getfleetServerHostsEnrollArgs(apiKey, fleetServerHosts, fleetProxy);
  const fleetServerUrl = enrollArgs?.split('--url=')?.pop()?.split('--enrollment')[0];
  const enrollmentToken = enrollArgs?.split('--enrollment-token=')[1];

  const k8sCommand = 'kubectl apply -f elastic-agent-managed-kubernetes.yml';

  const linuxCommand = `curl -L -O https://artifacts.elastic.co/downloads/beats/elastic-agent/elastic-agent-${agentVersion}-linux-x86_64.tar.gz
tar xzvf elastic-agent-${agentVersion}-linux-x86_64.tar.gz
cd elastic-agent-${agentVersion}-linux-x86_64
sudo ./elastic-agent install ${enrollArgs}`;

  const macCommand = `curl -L -O https://artifacts.elastic.co/downloads/beats/elastic-agent/elastic-agent-${agentVersion}-darwin-x86_64.tar.gz
tar xzvf elastic-agent-${agentVersion}-darwin-x86_64.tar.gz
cd elastic-agent-${agentVersion}-darwin-x86_64
sudo ./elastic-agent install ${enrollArgs}`;

  const windowsCommand = `$ProgressPreference = 'SilentlyContinue'
Invoke-WebRequest -Uri https://artifacts.elastic.co/downloads/beats/elastic-agent/elastic-agent-${agentVersion}-windows-x86_64.zip -OutFile elastic-agent-${agentVersion}-windows-x86_64.zip
Expand-Archive .\\elastic-agent-${agentVersion}-windows-x86_64.zip -DestinationPath .
cd elastic-agent-${agentVersion}-windows-x86_64
.\\elastic-agent.exe install ${enrollArgs}`;

  const linuxDebCommand = `curl -L -O https://artifacts.elastic.co/downloads/beats/elastic-agent/elastic-agent-${agentVersion}-amd64.deb
sudo dpkg -i elastic-agent-${agentVersion}-amd64.deb
sudo elastic-agent enroll ${enrollArgs} \nsudo systemctl enable elastic-agent \nsudo systemctl start elastic-agent`;

  const linuxRpmCommand = `curl -L -O https://artifacts.elastic.co/downloads/beats/elastic-agent/elastic-agent-${agentVersion}-x86_64.rpm
sudo rpm -vi elastic-agent-${agentVersion}-x86_64.rpm
sudo elastic-agent enroll ${enrollArgs} \nsudo systemctl enable elastic-agent \nsudo systemctl start elastic-agent`;

  const googleCloudShellCommand = `gcloud config set project ${gcpProjectId} && ${
    gcpAccountType === 'organization-account' ? `ORG_ID=${gcpOrganizationId}` : ``
  } FLEET_URL=${fleetServerUrl?.trim()} ENROLLMENT_TOKEN=${enrollmentToken} STACK_VERSION=${agentVersion} ./deploy.sh`;

  return {
    linux: linuxCommand,
    mac: macCommand,
    windows: windowsCommand,
    deb: linuxDebCommand,
    rpm: linuxRpmCommand,
    kubernetes: k8sCommand,
    cloudFormation: '',
    googleCloudShell: googleCloudShellCommand,
  };
};
