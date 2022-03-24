/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PLATFORM_TYPE } from '../../../../hooks';

export type CommandsByPlatform = {
  [key in PLATFORM_TYPE]: string;
};

export function getInstallCommandForPlatform(
  platform: PLATFORM_TYPE,
  esHost: string,
  serviceToken: string,
  policyId?: string,
  fleetServerHost?: string,
  isProductionDeployment?: boolean,
  sslCATrustedFingerprint?: string
): CommandsByPlatform {
  const commandArguments = [];
  const newLineSeparator = platform === 'windows' ? '`\n' : '\\\n';

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
  } else {
    commandArguments.push(['fleet-server-insecure-http']);
  }

  const commandArgumentsStr = commandArguments.reduce((acc, [key, val]) => {
    if (acc === '' && key === 'url') {
      return `--${key}=${val}`;
    }
    const valOrEmpty = val ? `=${val}` : '';
    return (acc += ` ${newLineSeparator}  --${key}${valOrEmpty}`);
  }, '');

  return {
    linux: `sudo ./elastic-agent install ${commandArgumentsStr}`,
    mac: `sudo ./elastic-agent install ${commandArgumentsStr}`,
    windows: `.\\elastic-agent.exe install ${commandArgumentsStr}`,
    deb: `sudo elastic-agent enroll ${commandArgumentsStr}`,
    rpm: `sudo elastic-agent enroll ${commandArgumentsStr}`,
  };
}
