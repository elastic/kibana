/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSpacer } from '@elastic/eui';

import type { Output, DownloadSource, FleetServerHost, FleetProxy } from '../../../../types';

import { FleetServerHostsSection } from './fleet_server_hosts_section';
import { OutputSection } from './output_section';
import { AgentBinarySection } from './agent_binary_section';
import { FleetProxiesSection } from './fleet_proxies_section';

export interface SettingsPageProps {
  outputs: Output[];
  proxies: FleetProxy[];
  fleetServerHosts: FleetServerHost[];
  deleteOutput: (output: Output) => void;
  deleteFleetServerHost: (fleetServerHost: FleetServerHost) => void;
  downloadSources: DownloadSource[];
  deleteDownloadSource: (ds: DownloadSource) => void;
  deleteFleetProxy: (proxy: FleetProxy) => void;
}

export const SettingsPage: React.FunctionComponent<SettingsPageProps> = ({
  outputs,
  proxies,
  fleetServerHosts,
  deleteOutput,
  deleteFleetServerHost,
  downloadSources,
  deleteDownloadSource,
  deleteFleetProxy,
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
      <EuiSpacer size="m" />
      <FleetProxiesSection proxies={proxies} deleteFleetProxy={deleteFleetProxy} />
    </>
  );
};
