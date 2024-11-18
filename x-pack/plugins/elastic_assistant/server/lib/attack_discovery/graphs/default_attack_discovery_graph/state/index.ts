/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AttackDiscovery, Replacements } from '@kbn/elastic-assistant-common';
import type { Document } from '@langchain/core/documents';
import type { StateGraphArgs } from '@langchain/langgraph';

import {
  DEFAULT_MAX_GENERATION_ATTEMPTS,
  DEFAULT_MAX_HALLUCINATION_FAILURES,
  DEFAULT_MAX_REPEATED_GENERATIONS,
} from '../constants';
import { getDefaultAttackDiscoveryPrompt } from '../nodes/helpers/get_default_attack_discovery_prompt';
import { getDefaultRefinePrompt } from '../nodes/refine/helpers/get_default_refine_prompt';
import type { GraphState } from '../types';

export const getDefaultGraphState = (): StateGraphArgs<GraphState>['channels'] => ({
  attackDiscoveries: {
    value: (x: AttackDiscovery[] | null, y?: AttackDiscovery[] | null) => y ?? x,
    default: () => null,
  },
  attackDiscoveryPrompt: {
    value: (x: string, y?: string) => y ?? x,
    default: () => getDefaultAttackDiscoveryPrompt(),
  },
  anonymizedAlerts: {
    value: (x: Document[], y?: Document[]) => y ?? x,
    default: () => [],
  },
  combinedGenerations: {
    value: (x: string, y?: string) => y ?? x,
    default: () => '',
  },
  combinedRefinements: {
    value: (x: string, y?: string) => y ?? x,
    default: () => '',
  },
  errors: {
    value: (x: string[], y?: string[]) => y ?? x,
    default: () => [],
  },
  generationAttempts: {
    value: (x: number, y?: number) => y ?? x,
    default: () => 0,
  },
  generations: {
    value: (x: string[], y?: string[]) => y ?? x,
    default: () => [],
  },
  hallucinationFailures: {
    value: (x: number, y?: number) => y ?? x,
    default: () => 0,
  },
  refinePrompt: {
    value: (x: string, y?: string) => y ?? x,
    default: () => getDefaultRefinePrompt(),
  },
  maxGenerationAttempts: {
    value: (x: number, y?: number) => y ?? x,
    default: () => DEFAULT_MAX_GENERATION_ATTEMPTS,
  },
  maxHallucinationFailures: {
    value: (x: number, y?: number) => y ?? x,
    default: () => DEFAULT_MAX_HALLUCINATION_FAILURES,
  },
  maxRepeatedGenerations: {
    value: (x: number, y?: number) => y ?? x,
    default: () => DEFAULT_MAX_REPEATED_GENERATIONS,
  },
  refinements: {
    value: (x: string[], y?: string[]) => y ?? x,
    default: () => [],
  },
  replacements: {
    value: (x: Replacements, y?: Replacements) => y ?? x,
    default: () => ({}),
  },
  unrefinedResults: {
    value: (x: AttackDiscovery[] | null, y?: AttackDiscovery[] | null) => y ?? x,
    default: () => null,
  },
});
