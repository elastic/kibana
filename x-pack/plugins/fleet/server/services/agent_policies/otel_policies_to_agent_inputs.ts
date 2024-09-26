/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SavedObjectsClientContract } from '@kbn/core/server';

import type {
  OtelPolicy,
  OtelInputReceivers,
  OtelInputExtensions,
} from '../../../common/types/models/otel';
import type { AgentPolicy } from '../../types';
import { findAndEmbedIntegrations } from '../otel_policy';

export const otelPoliciesToAgentInputs = async (
  soClient: SavedObjectsClientContract,
  agentPolicy: AgentPolicy
) => {
  if (!agentPolicy?.otel_policies) return;

  const parsedInputs = [];
  for (const otelPolicy of agentPolicy.otel_policies) {
    parsedInputs.push(...(await otelPolicyToAgentInput(soClient, otelPolicy)));
  }
  return parsedInputs;
};

const otelPolicyToAgentReceivers = (otelPolicy: OtelPolicy) => {
  const inputId = `integrations/${otelPolicy?.integration?.name}-${otelPolicy.id}`;
  const data = {
    ...(otelPolicy?.integration?.name ? { name: otelPolicy.integration.name } : null),
    ...(otelPolicy?.integration?.version ? { version: otelPolicy.integration.version } : null),
    ...(otelPolicy?.pipelines ? { pipelines: otelPolicy.pipelines } : null),
    ...(otelPolicy?.vars ? { parameters: otelPolicy.vars } : null),
  };
  const result: OtelInputReceivers = { receivers: { [inputId]: data } };
  return result;
};

const otelPolicyToAgentInput = async (
  soClient: SavedObjectsClientContract,
  otelPolicy: OtelPolicy
) => {
  let extensions: OtelInputExtensions = {};
  // TODO: move this query to otel policy service
  if (otelPolicy?.integration?.name) {
    const template = await findAndEmbedIntegrations(soClient, otelPolicy?.integration?.name);
    extensions = {
      extensions: { config_integrations: { integrations: template } },
    };
  }

  const receivers = otelPolicyToAgentReceivers(otelPolicy);

  return [{ ...extensions, ...receivers }];
};
