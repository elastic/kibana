/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { filterGroundingEvaluator } from './filter_grounding';
import { createSearchHit, createKI } from '../test_helpers';

describe('filter_grounding evaluator', () => {
  it('scores 1 for a fully grounded eq filter', async () => {
    const result = await filterGroundingEvaluator.evaluate({
      input: { sample_documents: [createSearchHit({ 'service.name': 'frontend' })] },
      output: {
        features: [
          createKI({
            id: 'entity-frontend',
            type: 'entity',
            description: 'frontend',
            confidence: 80,
            filter: { field: 'service.name', eq: 'frontend' },
          }),
        ],
      },
      expected: { criteria: [], expected_ground_truth: '', expect_entity_filters: true },
      metadata: null,
    });

    expect(result.score).toBe(1);
  });

  it('scores 0 for a filter with an ungrounded eq value', async () => {
    const result = await filterGroundingEvaluator.evaluate({
      input: { sample_documents: [createSearchHit({ 'service.name': 'frontend' })] },
      output: {
        features: [
          createKI({
            id: 'entity-checkout',
            type: 'entity',
            description: 'checkout',
            confidence: 80,
            filter: { field: 'service.name', eq: 'checkout' },
          }),
        ],
      },
      expected: { criteria: [], expected_ground_truth: '', expect_entity_filters: true },
      metadata: null,
    });

    expect(result.score).toBe(0);
    expect(result.explanation).toContain('service.name=checkout');
  });

  it('scores 0 for a filter using only non-eq operators', async () => {
    const result = await filterGroundingEvaluator.evaluate({
      input: { sample_documents: [createSearchHit({ 'http.response.status_code': 500 })] },
      output: {
        features: [
          createKI({
            id: 'entity-errors',
            type: 'entity',
            description: 'error responses',
            confidence: 80,
            filter: { field: 'http.response.status_code', gte: 500 },
          }),
        ],
      },
      expected: { criteria: [], expected_ground_truth: '', expect_entity_filters: true },
      metadata: null,
    });

    expect(result.score).toBe(0);
  });

  it('handles AND conditions and partially grounds them', async () => {
    const result = await filterGroundingEvaluator.evaluate({
      input: {
        sample_documents: [createSearchHit({ 'service.name': 'frontend', 'span.kind': 'server' })],
      },
      output: {
        features: [
          createKI({
            id: 'entity-frontend',
            type: 'entity',
            description: 'frontend',
            confidence: 80,
            filter: {
              and: [
                { field: 'service.name', eq: 'frontend' }, // grounded
                { field: 'service.name', eq: 'wrong-value' }, // not grounded
              ],
            },
          }),
        ],
      },
      expected: { criteria: [], expected_ground_truth: '', expect_entity_filters: true },
      metadata: null,
    });

    expect(result.score).toBe(0.5);
  });

  it('returns null when no entities have filters', async () => {
    const result = await filterGroundingEvaluator.evaluate({
      input: { sample_documents: [createSearchHit({ 'service.name': 'frontend' })] },
      output: {
        features: [
          createKI({
            id: 'entity-frontend',
            type: 'entity',
            description: 'frontend',
            confidence: 80,
          }),
        ],
      },
      expected: { criteria: [], expected_ground_truth: '', expect_entity_filters: true },
      metadata: null,
    });

    expect(result.score).toBeNull();
  });

  it('skips evaluation when expect_entity_filters is not set', async () => {
    const result = await filterGroundingEvaluator.evaluate({
      input: { sample_documents: [] },
      output: { features: [] },
      expected: { criteria: [], expected_ground_truth: '' },
      metadata: null,
    });

    expect(result.score).toBeNull();
  });
});
