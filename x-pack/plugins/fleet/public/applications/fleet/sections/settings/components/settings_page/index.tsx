/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSpacer } from '@elastic/eui';

import type { Output, DownloadSource, FleetServerHost } from '../../../../types';

import { FleetServerHostsSection } from './fleet_server_hosts_section';
import { OutputSection } from './output_section';
import { AgentBinarySection } from './agent_binary_section';

export interface SettingsPageProps {
  outputs: Output[];
  fleetServerHosts: FleetServerHost[];
  deleteOutput: (output: Output) => void;
  deleteFleetServerHost: (fleetServerHost: FleetServerHost) => void;
  downloadSources: DownloadSource[];
  deleteDownloadSource: (ds: DownloadSource) => void;
}

export const SettingsPage: React.FunctionComponent<SettingsPageProps> = ({
  outputs,
  fleetServerHosts,
  deleteOutput,
  deleteFleetServerHost,
  downloadSources,
  deleteDownloadSource,
}) => {
  return (
    <>
      <EuiSpacer size="m" />
      <FleetServerHostsSection
        fleetServerHosts={fleetServerHosts}
        deleteFleetServerHost={deleteFleetServerHost}
      />
      <EuiSpacer size="m" />
      <OutputSection outputs={outputs} deleteOutput={deleteOutput} />
      <EuiSpacer size="m" />
      <AgentBinarySection
        downloadSources={downloadSources}
        deleteDownloadSource={deleteDownloadSource}
      />
    </>
  );
};
