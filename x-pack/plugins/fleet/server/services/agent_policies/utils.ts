/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject } from '@kbn/core-saved-objects-common/src/server_types';

import type { AgentPolicy } from '../../../common';
import type { AgentPolicySOAttributes } from '../../types';

export const mapAgentPolicySavedObjectToAgentPolicy = ({
  /* eslint-disable @typescript-eslint/naming-convention */
  id,
  attributes: {
    name,
    namespace,
    monitoring_enabled,
    revision,
    updated_at,
    updated_by,
    agent_features,
    agents,
    data_output_id,
    description,
    download_source_id,
    fleet_server_host_id,
    has_fleet_server,
    inactivity_timeout,
    is_default,
    is_default_fleet_server,
    is_managed,
    is_preconfigured,
    is_protected,
    monitoring_output_id,
    overrides,
    package_policies,
    schema_version,
    status,
    unenroll_timeout,
  },
}: SavedObject<AgentPolicySOAttributes>): AgentPolicy => {
  return {
    id,
    name,
    namespace,
    description,
    is_default,
    is_default_fleet_server,
    has_fleet_server,
    is_managed,
    monitoring_enabled,
    unenroll_timeout,
    inactivity_timeout,
    is_preconfigured,
    data_output_id,
    monitoring_output_id,
    download_source_id,
    fleet_server_host_id,
    schema_version,
    agent_features,
    is_protected,
    overrides,
    status,
    package_policies,
    agents,
    revision,
    updated_at,
    updated_by,
  };
};
