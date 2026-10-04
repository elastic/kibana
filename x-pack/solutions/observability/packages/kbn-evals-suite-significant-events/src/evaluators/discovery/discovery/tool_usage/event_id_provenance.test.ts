/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConverseStep } from '@kbn/evals';
import { platformSignificantEventsTools } from '@kbn/agent-builder-common';
import { scoreContinuationEventIdProvenance, scoreEventIdProvenance } from './event_id_provenance';

const searchCall = (
  events: Array<{ event_id: string; status: string }>,
  groupId = 'search-group'
): ConverseStep => ({
  type: 'tool_call',
  tool_id: platformSignificantEventsTools.searchEvent,
  tool_call_id: `search-${groupId}`,
  tool_call_group_id: groupId,
  params: { status: 'open' },
  results: [{ data: { events, total: events.length } }],
});

const writeCall = ({
  items,
  groupId = 'write-group',
  itemResults,
}: {
  items: Array<Record<string, unknown>>;
  groupId?: string;
  itemResults?: Array<Record<string, unknown>>;
}): ConverseStep => ({
  type: 'tool_call',
  tool_id: platformSignificantEventsTools.eventsWrite,
  tool_call_id: `write-${groupId}`,
  tool_call_group_id: groupId,
  params: { items },
  ...(itemResults === undefined ? {} : { results: [{ data: { results: itemResults } }] }),
});

describe('event_id_provenance', () => {
  it('accepts an id from an open event returned by a prior event_search group', () => {
    const result = scoreEventIdProvenance([
      searchCall([{ event_id: 'open-event', status: 'open' }]),
      writeCall({ items: [{ event_id: 'open-event' }] }),
    ]);

    expect(result).toMatchObject({ score: 1, idBearingItems: 1, validItems: 1 });
  });

  it.each(['closed', 'dismissed'])('rejects an id from a %s event_search result', (status) => {
    const result = scoreEventIdProvenance([
      searchCall([{ event_id: `${status}-event`, status }]),
      writeCall({ items: [{ event_id: `${status}-event` }] }),
    ]);

    expect(result).toMatchObject({ score: 0, idBearingItems: 1, validItems: 0 });
    expect(result.explanation).toContain(`${status}-event`);
  });

  it('rejects an invented id', () => {
    const result = scoreEventIdProvenance([writeCall({ items: [{ event_id: 'invented-event' }] })]);

    expect(result).toMatchObject({ score: 0, idBearingItems: 1, validItems: 0 });
    expect(result.explanation).toContain('invented-event');
  });

  it('does not accept an id returned by an earlier successful events_write', () => {
    const result = scoreEventIdProvenance([
      writeCall({
        groupId: 'first-write',
        items: [{ status: 'open' }],
        itemResults: [{ index: 0, event_id: 'generated-event', written: true }],
      }),
      writeCall({
        groupId: 'second-write',
        items: [{ event_id: 'generated-event', status: 'open' }],
      }),
    ]);

    expect(result).toMatchObject({ score: 0, idBearingItems: 1, validItems: 0 });
    expect(result.explanation).toContain('generated-event');
  });

  it('rejects a bad id echoed by unknown_event_id and repeated in a second write', () => {
    const result = scoreEventIdProvenance([
      writeCall({
        groupId: 'first-write',
        items: [{ event_id: 'bad-event' }],
        itemResults: [
          { index: 0, event_id: 'bad-event', written: false, reason: 'unknown_event_id' },
        ],
      }),
      writeCall({ groupId: 'retry-write', items: [{ event_id: 'bad-event' }] }),
    ]);

    expect(result).toMatchObject({ score: 0, idBearingItems: 2, validItems: 0 });
    expect(result.explanation).toContain('bad-event');
  });

  it('rejects an open event_search id from the same tool-call group as the write', () => {
    const result = scoreEventIdProvenance([
      searchCall([{ event_id: 'parallel-event', status: 'open' }], 'parallel-group'),
      writeCall({
        groupId: 'parallel-group',
        items: [{ event_id: 'parallel-event' }],
      }),
    ]);

    expect(result).toMatchObject({ score: 0, idBearingItems: 1, validItems: 0 });
  });

  it('returns a null score when no write item carries an event_id', () => {
    const result = scoreEventIdProvenance([
      searchCall([{ event_id: 'open-event', status: 'open' }]),
      writeCall({ items: [{ status: 'open' }] }),
    ]);

    expect(result).toMatchObject({ score: null, idBearingItems: 0, validItems: 0 });
  });

  it('resets provenance per continuation cycle and pools item scores', () => {
    const result = scoreContinuationEventIdProvenance([
      {
        producedEventIds: ['open-event'],
        steps: [
          searchCall([{ event_id: 'open-event', status: 'open' }]),
          writeCall({ items: [{ event_id: 'open-event' }] }),
        ],
      },
      {
        producedEventIds: ['open-event'],
        steps: [
          writeCall({
            groupId: 'cycle-two-write',
            items: [{ event_id: 'open-event' }],
          }),
        ],
      },
    ]);

    expect(result).toMatchObject({ score: 0.5, idBearingItems: 2, validItems: 1 });
    expect(result.explanation).toContain('cycle 2');
  });
});
