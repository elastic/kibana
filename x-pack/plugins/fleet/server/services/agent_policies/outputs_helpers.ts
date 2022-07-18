/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';

import type { AgentPolicySOAttributes } from '../../types';
import { LICENCE_FOR_PER_POLICY_OUTPUT, outputType } from '../../../common';
import { appContextService } from '..';
import { outputService } from '../output';
import { OutputInvalidError, OutputLicenceError } from '../../errors';

/**
 * Get the data output for a given agent policy
 * @param soClient
 * @param agentPolicy
 * @returns
 */
export async function getDataOutputForAgentPolicy(
  soClient: SavedObjectsClientContract,
  agentPolicy: Partial<AgentPolicySOAttributes>
) {
  const dataOutputId =
    agentPolicy.data_output_id || (await outputService.getDefaultDataOutputId(soClient));

  if (!dataOutputId) {
    throw new Error('No default data output found.');
  }

  return outputService.get(soClient, dataOutputId);
}

/**
 * Validate outputs are valid for a policy using the current kibana licence or throw.
 * @param data
 * @returns
 */
export async function validateOutputForPolicy(
  soClient: SavedObjectsClientContract,
  newData: Partial<AgentPolicySOAttributes>,
  existingData: Partial<AgentPolicySOAttributes> = {},
  isPolicyUsingAPM = false
) {
  if (
    newData.data_output_id === existingData.data_output_id &&
    newData.monitoring_output_id === existingData.monitoring_output_id
  ) {
    return;
  }

  const data = { ...existingData, ...newData };

  if (isPolicyUsingAPM) {
    const dataOutput = await getDataOutputForAgentPolicy(soClient, data);

    if (dataOutput.type === outputType.Logstash) {
      throw new OutputInvalidError(
        'Logstash output is not usable with policy using the APM integration.'
      );
    }
  }

  if (!data.data_output_id && !data.monitoring_output_id) {
    return;
  }

  // Do not validate licence output for managed and preconfigured policy
  if (data.is_managed && data.is_preconfigured) {
    return;
  }

  const hasLicence = appContextService
    .getSecurityLicense()
    .hasAtLeast(LICENCE_FOR_PER_POLICY_OUTPUT);

  if (!hasLicence) {
    throw new OutputLicenceError(
      `Invalid licence to set per policy output, you need ${LICENCE_FOR_PER_POLICY_OUTPUT} licence`
    );
  }
}
