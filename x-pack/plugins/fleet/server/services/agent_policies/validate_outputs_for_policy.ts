/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentPolicySOAttributes } from '../../types';
import { LICENCE_FOR_PER_POLICY_OUTPUT } from '../../../common';
import { appContextService } from '..';

/**
 * Validate outputs are valid for a policy using the current kibana licence or throw.
 * @param data
 * @returns
 */
export async function validateOutputForPolicy(
  newData: Partial<AgentPolicySOAttributes>,
  oldData: Partial<AgentPolicySOAttributes> = {}
) {
  if (
    newData.data_output_id === oldData.data_output_id &&
    newData.monitoring_output_id === oldData.monitoring_output_id
  ) {
    return;
  }

  const data = { ...oldData, ...newData };

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
    throw new Error(
      `Invalid licence to set per policy output, you need ${LICENCE_FOR_PER_POLICY_OUTPUT} licence`
    );
  }
}
