/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { evidenceGroundingEvaluator } from './evidence_grounding';
import { createSearchHit, createKI } from '../test_helpers';

describe('evidence_grounding evaluator', () => {
  it('does not treat short evidence as grounded by substring matches inside larger words', async () => {
    const result = await evidenceGroundingEvaluator.evaluate({
      input: {
        sample_documents: [
          createSearchHit({
            message: 'Request TARGET completed',
          }),
        ],
      },
      output: {
        features: [
          createKI({
            id: 'entity-frontend',
            type: 'entity',
            description: 'frontend service',
            confidence: 80,
            evidence: ['GET'],
          }),
        ],
      },
      expected: {
        criteria: [],
        expected_ground_truth: '',
      },
      metadata: null,
    });

    expect(result.score).toBe(0);
    expect(result.explanation).toContain('"GET"');
  });

  it('still grounds short evidence when it appears as its own token', async () => {
    const result = await evidenceGroundingEvaluator.evaluate({
      input: {
        sample_documents: [
          createSearchHit({
            message: 'GET /api/cart returned 200',
          }),
        ],
      },
      output: {
        features: [
          createKI({
            id: 'entity-cart',
            type: 'entity',
            description: 'cart service',
            confidence: 80,
            evidence: ['GET'],
          }),
        ],
      },
      expected: {
        criteria: [],
        expected_ground_truth: '',
      },
      metadata: null,
    });

    expect(result.score).toBe(1);
  });

  it('grounds evidence with trailing "..." by matching the prefix', async () => {
    const result = await evidenceGroundingEvaluator.evaluate({
      input: {
        sample_documents: [
          createSearchHit({
            body: { text: '[PlaceOrder] user_id=abc123 req_id=xyz987' },
          }),
        ],
      },
      output: {
        features: [
          createKI({
            id: 'checkout-service',
            type: 'entity',
            description: 'checkout service',
            confidence: 80,
            evidence: ['body.text=[PlaceOrder] user_id=...'],
          }),
        ],
      },
      expected: { criteria: [], expected_ground_truth: '' },
      metadata: null,
    });

    expect(result.score).toBe(1);
  });

  it('skips features with empty evidence (coverage is measured separately)', async () => {
    const result = await evidenceGroundingEvaluator.evaluate({
      input: {
        sample_documents: [
          createSearchHit({
            body: { text: 'some log message' },
          }),
        ],
      },
      output: {
        features: [
          createKI({
            id: 'entity-with-evidence',
            type: 'entity',
            description: 'grounded entity',
            confidence: 80,
            evidence: ['some log message'],
          }),
          createKI({
            id: 'entity-no-evidence',
            type: 'entity',
            description: 'entity with no evidence',
            confidence: 80,
            evidence: [],
          }),
        ],
      },
      expected: { criteria: [], expected_ground_truth: '' },
      metadata: null,
    });

    expect(result.score).toBe(1);
  });

  it('supports array index paths in key value evidence', async () => {
    const result = await evidenceGroundingEvaluator.evaluate({
      input: {
        sample_documents: [
          createSearchHit({
            labels: [{ key: 'deployment.environment', value: 'production' }],
          }),
        ],
      },
      output: {
        features: [
          createKI({
            id: 'infra-kubernetes',
            type: 'infrastructure',
            description: 'runtime environment',
            confidence: 90,
            evidence: ['labels.0.key=deployment.environment'],
          }),
        ],
      },
      expected: {
        criteria: [],
        expected_ground_truth: '',
      },
      metadata: null,
    });

    expect(result.score).toBe(1);
  });
});
