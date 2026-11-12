/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { ProposeWikiEdits } from '@kbn/nightshift-investigations-plugin/server/wiki/optimize';
import { readWikiReplayDataset } from './datasets';
import { runWikiReplay } from './task';
import type { WikiReplayExample } from './types';

const logger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
} as unknown as Logger;

const getExample = (caseId: string): WikiReplayExample => {
  const found = readWikiReplayDataset().examples.find(
    ({ metadata }) => metadata.case_id === caseId
  );
  if (!found) throw new Error(`No bundled example ${caseId}`);
  return found;
};

describe('runWikiReplay', () => {
  it('replays each round against one store and records what the optimizer saw and wrote', async () => {
    const proposeEdits: ProposeWikiEdits = jest
      .fn()
      .mockResolvedValueOnce({
        edits: [
          {
            action: 'upsert',
            entity_type: 'service',
            slug: 'checkout-api',
            title: 'checkout-api',
            content: '## Overview\nHandles checkout.',
          },
        ],
      })
      .mockResolvedValueOnce({
        edits: [
          {
            action: 'upsert',
            entity_type: 'service',
            slug: 'checkout-api',
            title: 'checkout-api',
            content: '## Dependencies\n- session-cache',
          },
        ],
      });

    const output = await runWikiReplay({
      example: getExample('synthetic-follow-up-missed-dependency'),
      proposeEdits,
      logger,
    });

    expect(output.error).toBeUndefined();
    expect(output.rounds.map(({ kind }) => kind)).toEqual(['initial', 'follow_up']);
    expect(output.rounds[0].pages_before).toEqual([]);
    expect(output.rounds[0].pages_after).toEqual([
      expect.objectContaining({ slug: 'checkout-api', status: 'tentative', corroborations: 0 }),
    ]);
    // The follow-up rewrites the page its own conversation wrote, which changes the content but
    // neither counts as a corroboration nor promotes it.
    expect(output.rounds[1].pages_after).toEqual([
      expect.objectContaining({
        slug: 'checkout-api',
        status: 'tentative',
        corroborations: 0,
        content: '## Dependencies\n- session-cache',
        conversation_id: 'conversation-synthetic-follow-up-missed-dependency',
      }),
    ]);
    expect(output.rounds[1].transcript).toContain('You never looked at the session cache');
    expect(output.rounds[0].transcript).toContain('[tool]');
    expect(output.rounds[0].proposed_edits).toHaveLength(1);
  });

  it('starts from the seeded pages and reports which ones they are', async () => {
    const proposeEdits: ProposeWikiEdits = jest.fn().mockResolvedValue({ edits: [] });

    const output = await runWikiReplay({
      example: getExample('synthetic-recovery-refuted'),
      proposeEdits,
      logger,
    });

    expect(output.seeded_ids).toEqual(['wiki_service_orders-consumer']);
    expect(output.rounds[0].pages_before).toEqual(output.rounds[0].pages_after);
    expect(proposeEdits).toHaveBeenCalledWith(
      expect.objectContaining({
        catalog: [
          expect.objectContaining({
            id: 'wiki_service_orders-consumer',
            authored_by: ['conversation-synthetic-recovery-refuted'],
          }),
        ],
      })
    );
    // The follow-up reads the content of the page its own conversation wrote.
    expect(proposeEdits).toHaveBeenCalledWith(
      expect.objectContaining({
        pageBodies: [
          expect.objectContaining({
            slug: 'orders-consumer',
            content: expect.stringContaining('slow disk'),
          }),
        ],
      })
    );
  });

  it('reports a failing round instead of throwing, keeping the rounds that ran', async () => {
    const proposeEdits: ProposeWikiEdits = jest
      .fn()
      .mockResolvedValueOnce({ edits: [] })
      .mockRejectedValueOnce(new Error('model unavailable'));

    const output = await runWikiReplay({
      example: getExample('synthetic-follow-up-missed-dependency'),
      proposeEdits,
      logger,
    });

    expect(output.error).toBe('model unavailable');
    expect(output.rounds).toHaveLength(1);
  });
});
