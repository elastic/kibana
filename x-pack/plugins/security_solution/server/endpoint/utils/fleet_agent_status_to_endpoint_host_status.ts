/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AgentStatus } from '../../../../fleet/common';
import { HostStatus } from '../../../common/endpoint/types';

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

/**
 * A Map of Fleet Agent Status to Endpoint Host Status.
 * Default status is `HostStatus.UNHEALTHY`
 */
export const fleetAgentStatusToEndpointHostStatus = (status: AgentStatus): HostStatus => {
  return STATUS_MAPPING.get(status) || HostStatus.UNHEALTHY;
};
