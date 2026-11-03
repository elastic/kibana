/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CUSTOMER0_CUSTOM_CONTEXT,
  RETROSPECTIVE_GUARDRAIL_CONTEXT,
  customContextForDataset,
  getDatasetCustomContext,
  getReadableIndicesContext,
} from './custom_context';

describe('getDatasetCustomContext', () => {
  const customer0Context = [...CUSTOMER0_CUSTOM_CONTEXT, RETROSPECTIVE_GUARDRAIL_CONTEXT];

  it('applies the customer0 context and the retrospective guardrail to customer0 example files', () => {
    expect(getDatasetCustomContext({ name: 'nightshift/customer0/incidents' })).toEqual(
      customer0Context
    );
  });

  it('applies the customer0 context and the retrospective guardrail to stored datasets tagged customer0', () => {
    expect(
      getDatasetCustomContext({
        name: 'ns-investigation-golden-2610',
        tags: ['nightshift', 'customer0', 'golden'],
      })
    ).toEqual(customer0Context);
  });

  it('applies no context to other datasets', () => {
    expect(getDatasetCustomContext({ name: 'nightshift/synthetic', tags: ['nightshift'] })).toEqual(
      []
    );
    expect(getDatasetCustomContext({ name: 'ns-investigation-golden-2610' })).toEqual([]);
  });
});

describe('getReadableIndicesContext', () => {
  it('turns the configured readable indices into a custom context snippet', () => {
    expect(
      getReadableIndicesContext({
        NIGHTSHIFT_SANDBOX_READABLE_INDICES: ' Read logs-orcabench.otel-*. ',
      })
    ).toEqual(['Read logs-orcabench.otel-*.']);
  });

  it('adds nothing when no readable indices are configured', () => {
    expect(getReadableIndicesContext({})).toEqual([]);
  });
});

describe('customContextForDataset', () => {
  it('keeps the readable-indices hint off customer0, matching production', () => {
    expect(
      customContextForDataset(
        { name: 'ns-investigation-golden', tags: ['customer0'] },
        { NIGHTSHIFT_SANDBOX_READABLE_INDICES: 'Read remote-a:logs-*' }
      )
    ).toEqual([...CUSTOMER0_CUSTOM_CONTEXT, RETROSPECTIVE_GUARDRAIL_CONTEXT]);
  });

  it('keeps the readable-indices hint for other datasets', () => {
    expect(
      customContextForDataset(
        { name: 'nightshift/orca-sampled50-v2' },
        { NIGHTSHIFT_SANDBOX_READABLE_INDICES: 'Read logs-orcabench.otel-*' }
      )
    ).toEqual(['Read logs-orcabench.otel-*']);
  });
});
