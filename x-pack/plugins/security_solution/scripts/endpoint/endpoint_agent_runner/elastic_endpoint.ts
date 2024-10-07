/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fetchActiveSpace } from '../common/spaces';
import { dump } from '../common/utils';
import { generateVmName } from '../common/vm_services';
import { createAndEnrollEndpointHost } from '../common/endpoint_host_services';
import {
  addEndpointIntegrationToAgentPolicy,
  getOrCreateDefaultAgentPolicy,
} from '../common/fleet_services';
import { getRuntimeServices } from './runtime';

export const enrollEndpointHost = async (): Promise<string | undefined> => {
  let vmName;

  const {
    log,
    kbnClient,
    options: { version, policy },
  } = getRuntimeServices();

  log.info(`Creating VM and enrolling Elastic Agent`);
  log.indent(4);

  try {
    const policyId: string = policy || (await getOrCreateAgentPolicyId());

    if (!policyId) {
      throw new Error(`No valid policy id provided or unable to create it`);
    }

    if (!version) {
      throw new Error(`No 'version' specified`);
    }

    const activeSpaceId = (await fetchActiveSpace(kbnClient)).id;

    vmName = generateVmName(`dev-${activeSpaceId}`);

    log.info(`Creating VM named: ${vmName}`);

    const { hostVm } = await createAndEnrollEndpointHost({
      kbnClient,
      log,
      hostname: vmName,
      agentPolicyId: policyId,
      version,
      useClosestVersionMatch: false,
      disk: '8G',
    });

    log.info(hostVm.info());
  } catch (error) {
    log.error(dump(error));
    log.indent(-4);
    throw error;
  }

  log.indent(-4);

  return vmName;
};

const getOrCreateAgentPolicyId = async (): Promise<string> => {
  const { kbnClient, log } = getRuntimeServices();
  const agentPolicy = await getOrCreateDefaultAgentPolicy({ kbnClient, log });

  await addEndpointIntegrationToAgentPolicy({ kbnClient, log, agentPolicyId: agentPolicy.id });

  return agentPolicy.id;
};
