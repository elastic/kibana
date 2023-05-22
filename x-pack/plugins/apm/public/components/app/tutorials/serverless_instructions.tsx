/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { INSTRUCTION_VARIANT } from './instruction_variants';
import {
  createJavaAgentInstructions,
  createNodeAgentInstructions,
  createDjangoAgentInstructions,
  createFlaskAgentInstructions,
  createRailsAgentInstructions,
  createRackAgentInstructions,
  createGoAgentInstructions,
  createDotNetAgentInstructions,
  createPhpAgentInstructions,
  createOpenTelemetryAgentInstructions,
} from './instructions';

export function serverlessInstructions({ baseUrl }: { baseUrl: string }) {
  return {
    title: i18n.translate('xpack.apm.tutorial.apmAgents.title', {
      defaultMessage: 'APM Agents',
    }),
    instructionVariants: [
      {
        id: INSTRUCTION_VARIANT.NODE,
        instructions: createNodeAgentInstructions(baseUrl),
      },
      {
        id: INSTRUCTION_VARIANT.DJANGO,
        instructions: createDjangoAgentInstructions(baseUrl),
      },
      {
        id: INSTRUCTION_VARIANT.FLASK,
        instructions: createFlaskAgentInstructions(baseUrl),
      },
      {
        id: INSTRUCTION_VARIANT.RAILS,
        instructions: createRailsAgentInstructions(baseUrl),
      },
      {
        id: INSTRUCTION_VARIANT.RACK,
        instructions: createRackAgentInstructions(baseUrl),
      },
      {
        id: INSTRUCTION_VARIANT.GO,
        instructions: createGoAgentInstructions(baseUrl),
      },
      {
        id: INSTRUCTION_VARIANT.JAVA,
        instructions: createJavaAgentInstructions(baseUrl),
      },
      {
        id: INSTRUCTION_VARIANT.DOTNET,
        instructions: createDotNetAgentInstructions(baseUrl),
      },
      {
        id: INSTRUCTION_VARIANT.PHP,
        instructions: createPhpAgentInstructions(baseUrl),
      },
      {
        id: INSTRUCTION_VARIANT.OPEN_TELEMETRY,
        instructions: createOpenTelemetryAgentInstructions(baseUrl),
      },
    ],
  };
}
