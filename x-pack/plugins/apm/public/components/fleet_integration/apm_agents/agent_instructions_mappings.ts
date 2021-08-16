/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createDotNetAgentInstructions,
  createDjangoAgentInstructions,
  createFlaskAgentInstructions,
  createGoAgentInstructions,
  createJavaAgentInstructions,
  createJsAgentInstructions,
  createNodeAgentInstructions,
  createPhpAgentInstructions,
  createRailsAgentInstructions,
  createRackAgentInstructions,
} from '../../../../common/tutorial/instructions/apm_agent_instructions';
import { AgentName } from '../../../../typings/es_schemas/ui/fields/agent';

export type CreateAgentInstructions = (
  apmServerUrl?: string,
  secretToken?: string
) => Array<{
  title: string;
  textPre?: string;
  commands?: string[];
  textPost?: string;
  customComponentName?: string;
}>;

export const ApmAgentInstructionsMappings: Array<{
  agentName: AgentName;
  title: string;
  variantId: string;
  createAgentInstructions: CreateAgentInstructions;
}> = [
  {
    agentName: 'java',
    title: 'Java',
    variantId: 'java',
    createAgentInstructions: createJavaAgentInstructions,
  },
  {
    agentName: 'rum-js',
    title: 'JavaScript (Real User Monitoring)',
    variantId: 'js',
    createAgentInstructions: createJsAgentInstructions,
  },
  {
    agentName: 'nodejs',
    title: 'Node.js',
    variantId: 'node',
    createAgentInstructions: createNodeAgentInstructions,
  },
  {
    agentName: 'python',
    title: 'Django',
    variantId: 'django',
    createAgentInstructions: createDjangoAgentInstructions,
  },
  {
    agentName: 'python',
    title: 'Flask',
    variantId: 'flask',
    createAgentInstructions: createFlaskAgentInstructions,
  },
  {
    agentName: 'ruby',
    title: 'Ruby on Rails',
    variantId: 'rails',
    createAgentInstructions: createRailsAgentInstructions,
  },
  {
    agentName: 'ruby',
    title: 'Rack',
    variantId: 'rack',
    createAgentInstructions: createRackAgentInstructions,
  },
  {
    agentName: 'go',
    title: 'Go',
    variantId: 'go',
    createAgentInstructions: createGoAgentInstructions,
  },
  {
    agentName: 'dotnet',
    title: '.NET',
    variantId: 'dotnet',
    createAgentInstructions: createDotNetAgentInstructions,
  },
  {
    agentName: 'php',
    title: 'PHP',
    variantId: 'php',
    createAgentInstructions: createPhpAgentInstructions,
  },
];
