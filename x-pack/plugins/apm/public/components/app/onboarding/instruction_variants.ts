/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiStepProps } from '@elastic/eui/src/components/steps/step';

export enum INSTRUCTION_VARIANT {
  NODE = 'node',
  DJANGO = 'django',
  FLASK = 'flask',
  RAILS = 'rails',
  RACK = 'rack',
  GO = 'go',
  JAVA = 'java',
  DOTNET = 'dotnet',
  PHP = 'php',
  OPEN_TELEMETRY = 'openTelemetry',
}

export interface InstructionVariant {
  id: INSTRUCTION_VARIANT;
  instructions: EuiStepProps[];
}

export interface InstructionSet {
  title: string;
  instructionVariants: InstructionVariant[];
}

const DISPLAY_MAP = {
  [INSTRUCTION_VARIANT.NODE]: 'Node.js',
  [INSTRUCTION_VARIANT.DJANGO]: 'Django',
  [INSTRUCTION_VARIANT.FLASK]: 'Flask',
  [INSTRUCTION_VARIANT.RAILS]: 'Ruby on Rails',
  [INSTRUCTION_VARIANT.RACK]: 'Rack',
  [INSTRUCTION_VARIANT.GO]: 'Go',
  [INSTRUCTION_VARIANT.JAVA]: 'Java',
  [INSTRUCTION_VARIANT.DOTNET]: '.NET',
  [INSTRUCTION_VARIANT.PHP]: 'PHP',
  [INSTRUCTION_VARIANT.OPEN_TELEMETRY]: 'OpenTelemetry',
};

export function getDisplayText(id: INSTRUCTION_VARIANT) {
  return id in DISPLAY_MAP ? DISPLAY_MAP[id] : id;
}

export interface AgentApiKey {
  apiKey: string | null;
  id?: string;
  error: boolean;
  errorMessage?: string;
}

export type AgentApiDetails = AgentApiKey & {
  displayApiKeySuccessCallout: boolean;
  displayApiKeyErrorCallout: boolean;
  createAgentKey: () => void;
  createApiKeyLoading: boolean;
};

export interface AgentInstructions {
  baseUrl: string;
  apmServerUrl: string;
  apiKeyDetails?: AgentApiDetails;
  secretToken?: string;
  checkAgentStatus: () => void;
  agentStatus?: boolean;
  agentStatusLoading: boolean;
}
