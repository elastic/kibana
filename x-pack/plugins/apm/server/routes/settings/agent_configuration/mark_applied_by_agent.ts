/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash';
import { Setup } from '../../../lib/helpers/setup_request';
import { AgentConfiguration } from '../../../../common/agent_configuration/configuration_types';

// We're not wrapping this function with a span as it is not blocking the request
export async function markAppliedByAgent({
  id,
  body,
  setup,
}: {
  id: string;
  body: AgentConfiguration;
  setup: Setup;
}) {
  const { internalClient, indices } = setup;

  const params = {
    index: indices.apmAgentConfigurationIndex,
    id, // by specifying the `id` elasticsearch will do an "upsert"
    body: {
      ...body,
      applied_by_agent: true,
    },
  };

  return internalClient.index<AgentConfiguration>(
    'mark_configuration_applied_by_agent',
    params
  );
}

export async function markAppliedByAgentThroughFleet({
  configsAppliedToAgentsThroughFleet,
  configurations,
  setup,
}: {
  configsAppliedToAgentsThroughFleet: Record<string, string>;
  configurations: AgentConfiguration[];
  setup: Setup;
}) {
  const { internalClient, indices } = setup;

  // Update only the configs that still have applied_by_agent=true
  // but have been applied by an agent
  const configsToUpdate = configurations.filter(
    (config) =>
      !config.applied_by_agent &&
      config.etag !== undefined &&
      configsAppliedToAgentsThroughFleet.hasOwnProperty(config.etag)
  );

  if (isEmpty(configsToUpdate)) {
    return;
  }

  const body = configsToUpdate.flatMap((doc) => [
    { update: { _id: doc.id } },
    { doc: { applied_by_agent: true } },
  ]);

  return internalClient.bulk('mark_config_applied_by_agent_through_fleet', {
    index: indices.apmAgentConfigurationIndex,
    body,
    refresh: 'wait_for',
  });
}
