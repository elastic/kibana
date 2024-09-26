/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { v4 as uuidV4 } from 'uuid';

import type { OtelPolicy, OtelInputReceivers } from '../../../common/types/models/otel';
import type { AgentPolicy } from '../../types';
const DEFAULT_PATH = '.';

export const otelPoliciesToAgentInputs = (agentPolicy: AgentPolicy) => {
  if (!agentPolicy?.otel_policies) return;

  let parsedInputs = {};
  for (const otelPolicy of agentPolicy.otel_policies) {
    parsedInputs = { ...parsedInputs, ...otelPolicyToAgentInput(otelPolicy) };
  }
  return parsedInputs;
};

const otelPolicyToAgentReceivers = (otelPolicy: OtelPolicy) => {
  const uniqueIntegrationName = `integrations/${otelPolicy?.integration?.name}-${uuidV4()}`;
  const data = {
    ...(otelPolicy?.integration?.name ? { name: otelPolicy.integration.name } : null),
    ...(otelPolicy?.integration?.version ? { version: otelPolicy.integration.version } : null),
    ...(otelPolicy?.pipelines ? { pipelines: otelPolicy.pipelines } : null),
    ...(otelPolicy?.vars ? { parameters: otelPolicy.vars } : null),
  };
  const result: OtelInputReceivers = { receivers: { [uniqueIntegrationName]: data } };
  return result;
};

const otelPolicyToAgentInput = (otelPolicy: OtelPolicy) => {
  const extensions = { extensions: { file_integrations: `${DEFAULT_PATH}` } };
  const receivers = otelPolicyToAgentReceivers(otelPolicy);

  return { ...extensions, ...receivers };
};
