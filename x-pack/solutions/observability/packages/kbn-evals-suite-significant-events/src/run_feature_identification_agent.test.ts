/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { platformSignificantEventsTools } from '@kbn/agent-builder-common';
import { FINALIZE_FEATURES_TOOL_ID } from '@kbn/significant-events-plugin/common';
import {
  getSimilarFeatureSearchCandidates,
  getSuccessfulFinalizeFeaturesParams,
} from './run_feature_identification_agent';

describe('getSuccessfulFinalizeFeaturesParams', () => {
  it('uses the last successfully completed finalization call', () => {
    expect(
      getSuccessfulFinalizeFeaturesParams([
        {
          type: 'tool_call',
          tool_id: FINALIZE_FEATURES_TOOL_ID,
          params: {},
          results: [{ type: 'error', data: { message: 'Invalid parameters' } }],
        },
        {
          type: 'tool_call',
          tool_id: FINALIZE_FEATURES_TOOL_ID,
          params: { features: [{ id: 'service-a' }] },
          results: [{ type: 'other', data: { finalized: true } }],
        },
      ])
    ).toEqual({ features: [{ id: 'service-a' }] });
  });

  it('rejects malformed output from a successful finalization call', () => {
    expect(() =>
      getSuccessfulFinalizeFeaturesParams([
        {
          type: 'tool_call',
          tool_id: FINALIZE_FEATURES_TOOL_ID,
          params: {},
          results: [{ type: 'other', data: { finalized: true } }],
        },
      ])
    ).toThrow('returned invalid finalization output');
  });
});

describe('getSimilarFeatureSearchCandidates', () => {
  it('collects candidates across similarity search calls only', () => {
    const candidate = (id: string) => ({
      candidate_id: id,
      title: id,
      description: id,
      type: 'entity',
    });

    expect(
      getSimilarFeatureSearchCandidates([
        {
          type: 'tool_call',
          tool_id: platformSignificantEventsTools.searchSimilarFeatures,
          params: { stream_name: 'logs', candidates: [candidate('a'), candidate('b')] },
        },
        { type: 'tool_call', tool_id: FINALIZE_FEATURES_TOOL_ID, params: { candidates: [] } },
        {
          type: 'tool_call',
          tool_id: platformSignificantEventsTools.searchSimilarFeatures,
          params: { stream_name: 'logs', candidates: [candidate('c')] },
        },
      ]).map(({ candidate_id: id }) => id)
    ).toEqual(['a', 'b', 'c']);
  });
});
