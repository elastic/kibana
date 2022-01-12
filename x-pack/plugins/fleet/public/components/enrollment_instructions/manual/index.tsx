/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useStartServices } from '../../../hooks';
import type { EnrollmentAPIKey } from '../../../types';

import { PlatformSelector } from './platform_selector';

interface Props {
  fleetServerHosts: string[];
  apiKey: EnrollmentAPIKey;
}

function getfleetServerHostsEnrollArgs(apiKey: EnrollmentAPIKey, fleetServerHosts: string[]) {
  return `--url=${fleetServerHosts[0]} --enrollment-token=${apiKey.api_key}`;
}

export const ManualInstructions: React.FunctionComponent<Props> = ({
  apiKey,
  fleetServerHosts,
}) => {
  const { docLinks } = useStartServices();
  const enrollArgs = getfleetServerHostsEnrollArgs(apiKey, fleetServerHosts);

  const linuxMacCommand = `sudo ./elastic-agent install ${enrollArgs}`;

  const windowsCommand = `.\\elastic-agent.exe install ${enrollArgs}`;

  return (
    <PlatformSelector
      linuxMacCommand={linuxMacCommand}
      windowsCommand={windowsCommand}
      installAgentLink={docLinks.links.fleet.installElasticAgent}
      troubleshootLink={docLinks.links.fleet.troubleshooting}
      isK8s={false}
    />
  );
};
