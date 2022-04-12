/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PLATFORM_TYPE } from '../../../hooks';

export type CommandsByPlatform = {
  [key in PLATFORM_TYPE]: string;
};

function getArtifact(platform: PLATFORM_TYPE, kibanaVersion: string) {
  const ARTIFACT_BASE_URL = 'https://artifacts.elastic.co/downloads/beats/elastic-agent';

  const artifactMap: Record<
    PLATFORM_TYPE,
    { fullUrl: string; filename: string; unpackedDir: string }
  > = {
    linux: {
      fullUrl: `${ARTIFACT_BASE_URL}/elastic-agent-${kibanaVersion}-linux-x86_64.zip`,
      filename: `elastic-agent-${kibanaVersion}-linux-x86_64.zip`,
      unpackedDir: `elastic-agent-${kibanaVersion}-linux-x86_64`,
    },
    mac: {
      fullUrl: `${ARTIFACT_BASE_URL}/elastic-agent-${kibanaVersion}-darwin-x86_64.tar.gz`,
      filename: `elastic-agent-${kibanaVersion}-darwin-x86_64.tar.gz`,
      unpackedDir: `elastic-agent-${kibanaVersion}-darwin-x86_64`,
    },
    windows: {
      fullUrl: `${ARTIFACT_BASE_URL}/elastic-agent-${kibanaVersion}-windows-x86_64.tar.gz`,
      filename: `elastic-agent-${kibanaVersion}-windows-x86_64.tar.gz`,
      unpackedDir: `elastic-agent-${kibanaVersion}-windows-x86_64`,
    },
    deb: {
      fullUrl: `${ARTIFACT_BASE_URL}/elastic-agent-${kibanaVersion}-amd64.deb`,
      filename: `elastic-agent-${kibanaVersion}-amd64.deb`,
      unpackedDir: `elastic-agent-${kibanaVersion}-amd64`,
    },
    rpm: {
      fullUrl: `${ARTIFACT_BASE_URL}/elastic-agent-${kibanaVersion}-x86_64.rpm`,
      filename: `elastic-agent-${kibanaVersion}-x86_64.rpm`,
      unpackedDir: `elastic-agent-${kibanaVersion}-x86_64`,
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
  kibanaVersion?: string
): string {
  const newLineSeparator = platform === 'windows' ? '`\n' : '\\\n';

  const artifact = getArtifact(platform, kibanaVersion ?? '');
  const downloadCommand =
    platform === 'windows'
      ? [
          `wget ${artifact.fullUrl} -OutFile ${artifact.filename}`,
          `Expand-Archive .\\${artifact.filename}`,
          `cd ${artifact.unpackedDir}`,
        ].join(` ${newLineSeparator}`)
      : [
          `curl -L -O ${artifact.fullUrl}`,
          `tar xzvf ${artifact.filename}`,
          `cd ${artifact.unpackedDir}`,
        ].join(` ${newLineSeparator}`);

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

  const commandArgumentsStr = commandArguments.reduce((acc, [key, val]) => {
    if (acc === '' && key === 'url') {
      return `--${key}=${val}`;
    }
    const valOrEmpty = val ? `=${val}` : '';
    return (acc += ` ${newLineSeparator}  --${key}${valOrEmpty}`);
  }, '');

  const commands = {
    linux: `${downloadCommand} ${newLineSeparator}sudo ./elastic-agent install${commandArgumentsStr}`,
    mac: `${downloadCommand} ${newLineSeparator}sudo ./elastic-agent install ${commandArgumentsStr}`,
    windows: `${downloadCommand}${newLineSeparator}.\\elastic-agent.exe install ${commandArgumentsStr}`,
    deb: `${downloadCommand} ${newLineSeparator}sudo elastic-agent enroll ${commandArgumentsStr}`,
    rpm: `${downloadCommand} ${newLineSeparator}sudo elastic-agent enroll ${commandArgumentsStr}`,
  };

  return commands[platform];
}
