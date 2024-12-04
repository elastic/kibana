/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getDefaultGraphState } from '.';
import {
  DEFAULT_MAX_GENERATION_ATTEMPTS,
  DEFAULT_MAX_HALLUCINATION_FAILURES,
  DEFAULT_MAX_REPEATED_GENERATIONS,
} from '../constants';
import { getDefaultAttackDiscoveryPrompt } from '../nodes/helpers/get_default_attack_discovery_prompt';
import { getDefaultRefinePrompt } from '../nodes/refine/helpers/get_default_refine_prompt';

const defaultAttackDiscoveryPrompt = getDefaultAttackDiscoveryPrompt();
const defaultRefinePrompt = getDefaultRefinePrompt();

describe('getDefaultGraphState', () => {
  it('returns the expected default attackDiscoveries', () => {
    const state = getDefaultGraphState();

    expect(state.attackDiscoveries?.default?.()).toBeNull();
  });

  it('returns the expected default attackDiscoveryPrompt', () => {
    const state = getDefaultGraphState();

    expect(state.attackDiscoveryPrompt?.default?.()).toEqual(defaultAttackDiscoveryPrompt);
  });

  it('returns the expected default empty collection of anonymizedAlerts', () => {
    const state = getDefaultGraphState();

    expect(state.anonymizedAlerts?.default?.()).toHaveLength(0);
  });

  it('returns the expected default combinedGenerations state', () => {
    const state = getDefaultGraphState();

    expect(state.combinedGenerations?.default?.()).toBe('');
  });

  it('returns the expected default combinedRefinements state', () => {
    const state = getDefaultGraphState();

    expect(state.combinedRefinements?.default?.()).toBe('');
  });

  it('returns the expected default errors state', () => {
    const state = getDefaultGraphState();

    expect(state.errors?.default?.()).toHaveLength(0);
  });

  it('return the expected default generationAttempts state', () => {
    const state = getDefaultGraphState();

    expect(state.generationAttempts?.default?.()).toBe(0);
  });

  it('returns the expected default generations state', () => {
    const state = getDefaultGraphState();

    expect(state.generations?.default?.()).toHaveLength(0);
  });

  it('returns the expected default hallucinationFailures state', () => {
    const state = getDefaultGraphState();

    expect(state.hallucinationFailures?.default?.()).toBe(0);
  });

  it('returns the expected default refinePrompt state', () => {
    const state = getDefaultGraphState();

    expect(state.refinePrompt?.default?.()).toEqual(defaultRefinePrompt);
  });

  it('returns the expected default maxGenerationAttempts state', () => {
    const state = getDefaultGraphState();

    expect(state.maxGenerationAttempts?.default?.()).toBe(DEFAULT_MAX_GENERATION_ATTEMPTS);
  });

  it('returns the expected default maxHallucinationFailures state', () => {
    const state = getDefaultGraphState();
    expect(state.maxHallucinationFailures?.default?.()).toBe(DEFAULT_MAX_HALLUCINATION_FAILURES);
  });

  it('returns the expected default maxRepeatedGenerations state', () => {
    const state = getDefaultGraphState();

    expect(state.maxRepeatedGenerations?.default?.()).toBe(DEFAULT_MAX_REPEATED_GENERATIONS);
  });

  it('returns the expected default refinements state', () => {
    const state = getDefaultGraphState();

    expect(state.refinements?.default?.()).toHaveLength(0);
  });

  it('returns the expected default replacements state', () => {
    const state = getDefaultGraphState();

    expect(state.replacements?.default?.()).toEqual({});
  });

  it('returns the expected default unrefinedResults state', () => {
    const state = getDefaultGraphState();

    expect(state.unrefinedResults?.default?.()).toBeNull();
  });
});
