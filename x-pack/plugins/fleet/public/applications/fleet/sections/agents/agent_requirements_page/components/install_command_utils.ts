/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PLATFORM_TYPE } from '../../../../hooks';

export function getInstallCommandForPlatform(
  platform: PLATFORM_TYPE,
  esHost: string,
  serviceToken: string,
  policyId?: string,
  fleetServerHost?: string,
  isProductionDeployment?: boolean
) {
  let commandArguments = '';
  const newLineSeparator = platform === 'windows' ? '`' : '\\';

  if (isProductionDeployment && fleetServerHost) {
    commandArguments += `--url=${fleetServerHost} ${newLineSeparator}\n`;
  }

  commandArguments += ` -f ${newLineSeparator}\n --fleet-server-es=${esHost}`;
  commandArguments += ` ${newLineSeparator}\n --fleet-server-service-token=${serviceToken}`;
  if (policyId) {
    commandArguments += ` ${newLineSeparator}\n  --fleet-server-policy=${policyId}`;
  }

  if (isProductionDeployment) {
    commandArguments += ` ${newLineSeparator}\n  --certificate-authorities=<PATH_TO_CA>`;
    commandArguments += ` ${newLineSeparator}\n  --fleet-server-es-ca=<PATH_TO_ES_CERT>`;
    commandArguments += ` ${newLineSeparator}\n  --fleet-server-cert=<PATH_TO_FLEET_SERVER_CERT>`;
    commandArguments += ` ${newLineSeparator}\n  --fleet-server-cert-key=<PATH_TO_FLEET_SERVER_CERT_KEY>`;
  }

  switch (platform) {
    case 'linux-mac':
      return `sudo ./elastic-agent install ${commandArguments}`;
    case 'windows':
      return `.\\elastic-agent.exe install ${commandArguments}`;
    case 'rpm-deb':
      return `sudo elastic-agent enroll ${commandArguments}`;
    default:
      return '';
  }
}
