/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AgentStatus } from '@kbn/fleet-plugin/common';
import { HostStatus } from '../../../common/endpoint/types';

// For an understanding of how fleet agent status is calculated:
// @see `x-pack/plugins/fleet/common/services/agent_status.ts`
const STATUS_MAPPING: ReadonlyMap<AgentStatus, HostStatus> = new Map([
  ['online', HostStatus.HEALTHY],
  ['offline', HostStatus.OFFLINE],
  ['inactive', HostStatus.INACTIVE],
  ['unenrolling', HostStatus.UPDATING],
  ['enrolling', HostStatus.UPDATING],
  ['updating', HostStatus.UPDATING],
  ['warning', HostStatus.UNHEALTHY],
  ['error', HostStatus.UNHEALTHY],
  ['degraded', HostStatus.UNHEALTHY],
]);

export const DEFAULT_ENDPOINT_HOST_STATUS = HostStatus.UNHEALTHY;

/**
 * A Map of Fleet Agent Status to Endpoint Host Status.
 * Default status is `HostStatus.UNHEALTHY`
 */
export const fleetAgentStatusToEndpointHostStatus = (status: AgentStatus): HostStatus => {
  return STATUS_MAPPING.get(status) || DEFAULT_ENDPOINT_HOST_STATUS;
};
