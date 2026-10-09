/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import { ToolingLog } from '@kbn/tooling-log';
import { restoreSnapshot } from '@kbn/es-snapshot-loader';
import { replayKnowledgeIndicatorsSnapshot } from './replay_knowledge_indicators_snapshot';
import { KNOWLEDGE_INDICATORS_DATA_STREAM } from './snapshot_indices';

jest.mock('@kbn/es-snapshot-loader', () => ({
  createGcsRepository: jest.fn(() => ({})),
  restoreSnapshot: jest.fn(async ({ renameReplacement }) => ({
    success: true,
    restoredIndices: [renameReplacement],
  })),
}));

describe('knowledge indicator snapshot replay', () => {
  it('binds captured knowledge to the evaluation source, space, and view', async () => {
    const reindex = jest.fn().mockResolvedValue({ total: 2, created: 2 });
    const indices = {
      delete: jest.fn().mockResolvedValue({}),
      refresh: jest.fn().mockResolvedValue({}),
    };
    const result = await replayKnowledgeIndicatorsSnapshot(
      { reindex, indices } as unknown as Client,
      new ToolingLog(),
      'snapshot',
      { bucket: 'bucket', basePathPrefix: 'prefix' },
      {
        sourceId: 'created-source-uuid',
        spaceId: 'evaluation-space',
        viewName: '$.nightshift.sources.evaluation-space.eval',
      }
    );
    expect(result).toEqual({ total: 2, created: 2 });
    expect(restoreSnapshot).toHaveBeenCalledTimes(1);
    expect(reindex).toHaveBeenCalledWith(
      expect.objectContaining({
        dest: { index: KNOWLEDGE_INDICATORS_DATA_STREAM, op_type: 'create' },
        script: expect.objectContaining({
          params: expect.objectContaining({
            source_id: 'created-source-uuid',
            space_id: 'evaluation-space',
            source_view: '$.nightshift.sources.evaluation-space.eval',
          }),
        }),
      }),
      expect.objectContaining({ requestTimeout: 300_000 })
    );
    expect(indices.refresh).toHaveBeenCalledWith({ index: KNOWLEDGE_INDICATORS_DATA_STREAM });
  });

  it('keeps the captured rule_backed state so grounding can find replayed queries', async () => {
    const reindex = jest.fn().mockResolvedValue({ total: 1, created: 1 });
    const indices = {
      delete: jest.fn().mockResolvedValue({}),
      refresh: jest.fn().mockResolvedValue({}),
    };
    await replayKnowledgeIndicatorsSnapshot(
      { reindex, indices } as unknown as Client,
      new ToolingLog(),
      'snapshot',
      { bucket: 'bucket', basePathPrefix: 'prefix' },
      { sourceId: 'source-uuid', spaceId: 'default', viewName: '$.nightshift.sources.default.eval' }
    );

    const { script } = reindex.mock.calls[0][0] as { script: { source: string } };
    // Grounding searches with `rule_backed: true`; assigning the field here would hide every query.
    expect(script.source).not.toMatch(/rule_backed\s*=/);
    expect(script.source).toContain(
      'ctx._source.query.esql.replace(capturedView, params.source_view)'
    );
  });
});
