/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { startFleetServer } from '../common/fleet_server/fleet_server_services';
import { getRuntimeServices } from './runtime';

export const runFleetServerIfNeeded = async (): Promise<
  { fleetServerContainerId: string; fleetServerAgentPolicyId: string | undefined } | undefined
> => {
  const { log, kbnClient } = getRuntimeServices();

  // Runs under CI should force fleet server to be installed because the CI process first
  // setups up Fleet server URL in kibana and then expects the server to be started. Forcing
  // install here will ensure the fleet server is setup even if it appears to already be setup
  // for kibana.
  const forceInstall = Boolean(process.env.CI);

  const startedFleetServer = await startFleetServer({
    kbnClient,
    logger: log,
    force: forceInstall,
  });

  return {
    fleetServerContainerId: startedFleetServer.id,
    fleetServerAgentPolicyId: startedFleetServer.policyId,
  };
};
