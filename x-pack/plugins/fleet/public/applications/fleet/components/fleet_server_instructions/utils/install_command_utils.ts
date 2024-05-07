/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DownloadSource } from '../../../../../../common/types';
import type { PLATFORM_TYPE } from '../../../hooks';

export type CommandsByPlatform = {
  [key in PLATFORM_TYPE]: string;
};

function getArtifact(
  platform: PLATFORM_TYPE,
  kibanaVersion: string,
  downloadSource?: DownloadSource
) {
  const ARTIFACT_BASE_URL = `${
    downloadSource
      ? downloadSource.host.endsWith('/')
        ? downloadSource.host.substring(0, downloadSource.host.length - 1)
        : downloadSource.host
      : 'https://artifacts.elastic.co/downloads'
  }/beats/elastic-agent`;

  const artifactMap: Record<PLATFORM_TYPE, { downloadCommand: string }> = {
    linux: {
      downloadCommand: [
        `curl -L -O ${ARTIFACT_BASE_URL}/elastic-agent-${kibanaVersion}-linux-x86_64.tar.gz`,
        `tar xzvf elastic-agent-${kibanaVersion}-linux-x86_64.tar.gz`,
        `cd elastic-agent-${kibanaVersion}-linux-x86_64`,
      ].join(`\n`),
    },
    mac: {
      downloadCommand: [
        `curl -L -O ${ARTIFACT_BASE_URL}/elastic-agent-${kibanaVersion}-darwin-x86_64.tar.gz`,
        `tar xzvf elastic-agent-${kibanaVersion}-darwin-x86_64.tar.gz`,
        `cd elastic-agent-${kibanaVersion}-darwin-x86_64`,
      ].join(`\n`),
    },
    windows: {
      downloadCommand: [
        `$ProgressPreference = 'SilentlyContinue'`,
        `Invoke-WebRequest -Uri https://artifacts.elastic.co/downloads/beats/elastic-agent/elastic-agent-${kibanaVersion}-windows-x86_64.zip -OutFile elastic-agent-${kibanaVersion}-windows-x86_64.zip`,
        `Expand-Archive .\\elastic-agent-${kibanaVersion}-windows-x86_64.zip`,
        `cd elastic-agent-${kibanaVersion}-windows-x86_64`,
      ].join(`\n`),
    },
    deb: {
      downloadCommand: [
        `curl -L -O ${ARTIFACT_BASE_URL}/elastic-agent-${kibanaVersion}-amd64.deb`,
        `sudo dpkg -i elastic-agent-${kibanaVersion}-amd64.deb`,
      ].join(`\n`),
    },
    rpm: {
      downloadCommand: [
        `curl -L -O ${ARTIFACT_BASE_URL}/elastic-agent-${kibanaVersion}-x86_64.rpm`,
        `sudo rpm -vi elastic-agent-${kibanaVersion}-x86_64.rpm`,
      ].join(`\n`),
    },
    kubernetes: {
      downloadCommand: '',
    },
  };

  return artifactMap[platform];
}

export function getInstallCommandForPlatform(
  platform: PLATFORM_TYPE,
  esHost: string,
  serviceToken: string,
  policyId?: string,
  fleetServerHost?: string,
  isProductionDeployment?: boolean,
  sslCATrustedFingerprint?: string,
  kibanaVersion?: string,
  downloadSource?: DownloadSource
): string {
  const newLineSeparator = platform === 'windows' ? '`\n' : '\\\n';

  const artifact = getArtifact(platform, kibanaVersion ?? '', downloadSource);

  const commandArguments = [];

  if (isProductionDeployment && fleetServerHost) {
    commandArguments.push(['url', fleetServerHost]);
  }

  commandArguments.push(['fleet-server-es', esHost]);
  commandArguments.push(['fleet-server-service-token', serviceToken]);
  if (policyId) {
    commandArguments.push(['fleet-server-policy', policyId]);
  }

  if (sslCATrustedFingerprint) {
    commandArguments.push(['fleet-server-es-ca-trusted-fingerprint', sslCATrustedFingerprint]);
  }

  if (isProductionDeployment) {
    commandArguments.push(['certificate-authorities', '<PATH_TO_CA>']);
    if (!sslCATrustedFingerprint) {
      commandArguments.push(['fleet-server-es-ca', '<PATH_TO_ES_CERT>']);
    }
    commandArguments.push(['fleet-server-cert', '<PATH_TO_FLEET_SERVER_CERT>']);
    commandArguments.push(['fleet-server-cert-key', '<PATH_TO_FLEET_SERVER_CERT_KEY>']);
  }

  commandArguments.push(['fleet-server-port', '8220']);

  const commandArgumentsStr = commandArguments
    .reduce((acc, [key, val]) => {
      if (acc === '' && key === 'url') {
        return `--${key}=${val}`;
      }
      const valOrEmpty = val ? `=${val}` : '';
      return (acc += ` ${newLineSeparator}  --${key}${valOrEmpty}`);
    }, '')
    .trim();

  const commands = {
    linux: `${artifact.downloadCommand}\nsudo ./elastic-agent install ${commandArgumentsStr}`,
    mac: `${artifact.downloadCommand}\nsudo ./elastic-agent install ${commandArgumentsStr}`,
    windows: `${artifact.downloadCommand}\n.\\elastic-agent.exe install ${commandArgumentsStr}`,
    deb: `${artifact.downloadCommand}\nsudo elastic-agent enroll ${commandArgumentsStr}\nsudo systemctl enable elastic-agent\nsudo systemctl start elastic-agent`,
    rpm: `${artifact.downloadCommand}\nsudo elastic-agent enroll ${commandArgumentsStr}\nsudo systemctl enable elastic-agent\nsudo systemctl start elastic-agent`,
    kubernetes: '',
    cloudFormation: '',
    googleCloudShell: '',
  };

  return commands[platform];
}
