/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { platformSignificantEventsTools } from '@kbn/agent-builder-common';
import type { ConverseStep } from '@kbn/evals';
import {
  extractDiscoveriesFromToolCall,
  extractRequestedEventIdsFromToolCall,
  extractSignificantEventsFromToolCall,
  extractWriteItemsFromToolCall,
} from './parse_agent_output';

const TOOL_ID_EVENTS_WRITE = platformSignificantEventsTools.eventsWrite;

describe('extractDiscoveriesFromToolCall', () => {
  it('returns [] when no events_write steps are present', () => {
    const steps: ConverseStep[] = [{ type: 'reasoning', reasoning: 'thinking' }];
    expect(extractDiscoveriesFromToolCall(steps)).toEqual([]);
  });

  it('skips invalid bulk input parameters', () => {
    const steps: ConverseStep[] = [
      {
        type: 'tool_call',
        tool_id: TOOL_ID_EVENTS_WRITE,
        tool_call_id: 'ew-invalid-params',
        params: { items: 'not-an-array' },
      },
    ];

    expect(extractDiscoveriesFromToolCall(steps)).toEqual([]);
  });

  it('extracts event_id from aligned tool results when params omit the items wrapper', () => {
    const steps: ConverseStep[] = [
      {
        type: 'tool_call',
        tool_id: TOOL_ID_EVENTS_WRITE,
        tool_call_id: 'ew-bare-item',
        params: {
          status: 'pending',
          dedup_window: 'now-24h',
          title: 'Bare item write',
        },
        results: [
          {
            data: {
              results: [{ index: 0, event_id: 'event-1', event_uuid: 'uuid-1', written: true }],
            },
          },
        ],
      },
    ];

    expect(extractDiscoveriesFromToolCall(steps)).toEqual([
      expect.objectContaining({ event_id: 'event-1' }),
    ]);
  });

  it('extracts aligned bulk results and omits failed items', () => {
    const steps: ConverseStep[] = [
      {
        type: 'tool_call',
        tool_id: TOOL_ID_EVENTS_WRITE,
        tool_call_id: 'ew-bulk',
        params: {
          items: [{ title: 'Persisted event', status: 'open' }, { title: 'Failed event' }],
        },
        results: [
          {
            data: {
              results: [
                {
                  index: 0,
                  event_id: 'event-1',
                  written: true,
                },
                { index: 1, event_id: 'event-2', written: false, reason: 'bulk_error' },
              ],
            },
          },
        ],
      },
    ];

    expect(extractDiscoveriesFromToolCall(steps)).toEqual([
      expect.objectContaining({
        title: 'Persisted event',
        event_id: 'event-1',
      }),
    ]);
    expect(extractDiscoveriesFromToolCall(steps)[0]).not.toHaveProperty('written');
  });

  it('treats existing_active_event and unchanged_outcome as produced discoveries', () => {
    const steps: ConverseStep[] = [
      {
        type: 'tool_call',
        tool_id: TOOL_ID_EVENTS_WRITE,
        tool_call_id: 'ew-dedup',
        params: { items: [{ title: 'Existing episode', status: 'open' }] },
        results: [
          {
            data: {
              results: [
                {
                  index: 0,
                  event_id: 'event-existing',
                  written: false,
                  reason: 'existing_active_event',
                  existing_event_id: 'event-existing',
                },
              ],
            },
          },
        ],
      },
      {
        type: 'tool_call',
        tool_id: TOOL_ID_EVENTS_WRITE,
        tool_call_id: 'ew-noop',
        params: {
          items: [{ event_id: 'event-stable', title: 'Unchanged continuation', status: 'open' }],
        },
        results: [
          {
            data: {
              results: [
                {
                  index: 0,
                  event_id: 'event-stable',
                  written: false,
                  reason: 'unchanged_outcome',
                },
              ],
            },
          },
        ],
      },
    ];

    expect(extractDiscoveriesFromToolCall(steps)).toEqual([
      expect.objectContaining({ event_id: 'event-existing', title: 'Existing episode' }),
      expect.objectContaining({ event_id: 'event-stable', title: 'Unchanged continuation' }),
    ]);
  });

  it('extracts events from live Agent Builder underscore tool ids', () => {
    const steps: ConverseStep[] = [
      {
        type: 'tool_call',
        tool_id: 'platform_sig_events_events_write',
        tool_call_id: 'ew-underscore',
        params: { items: [{ title: 'Live event', status: 'open' }] },
        results: [
          {
            data: {
              results: [{ index: 0, event_uuid: 'uuid-1', event_id: 'event-1', written: true }],
            },
          },
        ],
      },
    ];

    expect(extractDiscoveriesFromToolCall(steps)).toEqual([
      expect.objectContaining({ event_id: 'event-1', title: 'Live event' }),
    ]);
  });

  it('skips misaligned bulk results', () => {
    const steps: ConverseStep[] = [
      {
        type: 'tool_call',
        tool_id: TOOL_ID_EVENTS_WRITE,
        tool_call_id: 'ew-misaligned',
        params: { items: [{ title: 'one' }, { title: 'two' }] },
        results: [{ data: { results: [] } }],
      },
    ];

    expect(extractDiscoveriesFromToolCall(steps)).toEqual([]);
  });

  it('skips reordered bulk results', () => {
    const steps: ConverseStep[] = [
      {
        type: 'tool_call',
        tool_id: TOOL_ID_EVENTS_WRITE,
        tool_call_id: 'ew-reordered',
        params: { items: [{ title: 'first' }, { title: 'second' }] },
        results: [
          {
            data: {
              results: [
                {
                  index: 1,
                  event_id: 'event-2',
                  written: true,
                },
                {
                  index: 0,
                  event_id: 'event-1',
                  written: true,
                },
              ],
            },
          },
        ],
      },
    ];

    expect(extractDiscoveriesFromToolCall(steps)).toEqual([]);
  });
});

describe('extractRequestedEventIdsFromToolCall', () => {
  it('returns only event IDs explicitly passed by the agent in items[]', () => {
    const steps: ConverseStep[] = [
      {
        type: 'tool_call',
        tool_id: TOOL_ID_EVENTS_WRITE,
        tool_call_id: 'ew-new',
        params: { items: [{ status: 'open' }] },
        results: [
          {
            data: {
              results: [
                {
                  index: 0,
                  event_id: 'handler-generated',
                  event_uuid: 'uuid-1',
                  written: true,
                },
              ],
            },
          },
        ],
      },
      {
        type: 'tool_call',
        tool_id: TOOL_ID_EVENTS_WRITE,
        tool_call_id: 'ew-continuation',
        params: {
          items: [{ event_id: 'agent-selected', status: 'open' }],
        },
        results: [
          {
            data: {
              results: [
                {
                  index: 0,
                  event_id: 'agent-selected',
                  event_uuid: 'uuid-2',
                  written: true,
                },
              ],
            },
          },
        ],
      },
    ];

    expect(extractRequestedEventIdsFromToolCall(steps)).toEqual(['agent-selected']);
  });

  it('returns all agent-supplied event IDs from a multi-item bulk write', () => {
    const steps: ConverseStep[] = [
      {
        type: 'tool_call',
        tool_id: TOOL_ID_EVENTS_WRITE,
        tool_call_id: 'ew-bulk',
        params: {
          items: [
            { status: 'open' },
            { event_id: 'event-A', status: 'open' },
            { event_id: 'event-B', status: 'open' },
          ],
        },
        results: [
          {
            data: {
              results: [
                {
                  index: 0,
                  event_id: 'handler-generated',
                  event_uuid: 'uuid-0',
                  written: true,
                },
                {
                  index: 1,
                  event_id: 'event-A',
                  event_uuid: 'uuid-1',
                  written: true,
                },
                {
                  index: 2,
                  event_id: 'event-B',
                  event_uuid: 'uuid-2',
                  written: true,
                },
              ],
            },
          },
        ],
      },
    ];

    expect(extractRequestedEventIdsFromToolCall(steps)).toEqual(['event-A', 'event-B']);
  });
});

describe('extractWriteItemsFromToolCall', () => {
  it('returns raw events_write request items without handler-assigned IDs', () => {
    const steps: ConverseStep[] = [
      {
        type: 'tool_call',
        tool_id: TOOL_ID_EVENTS_WRITE,
        tool_call_id: 'ew-bulk',
        params: {
          items: [
            {
              event_id: 'event-1',
              causal_features: [
                { feature_id: 'ledgerwriter', name: 'ledgerwriter', stream_name: 'logs' },
              ],
              blast_radius: [],
            },
            { status: 'dismissed', causal_features: [], blast_radius: [] },
          ],
        },
      },
    ];

    expect(extractWriteItemsFromToolCall(steps)).toEqual([
      {
        event_id: 'event-1',
        causal_features: [
          { feature_id: 'ledgerwriter', name: 'ledgerwriter', stream_name: 'logs' },
        ],
        blast_radius: [],
      },
      { status: 'dismissed', causal_features: [], blast_radius: [] },
    ]);
  });
});

describe('extractSignificantEventsFromToolCall', () => {
  it('returns [] when no events_write steps are present', () => {
    const steps: ConverseStep[] = [
      { type: 'reasoning', reasoning: 'thinking' },
      {
        type: 'tool_call',
        tool_id: 'other-tool',
        tool_call_id: 'ew-1',
        params: { status: 'open' },
      },
    ];
    expect(extractSignificantEventsFromToolCall(steps)).toEqual([]);
  });

  it('extracts successful items from a bulk write and its partial-failure retry', () => {
    const steps: ConverseStep[] = [
      {
        type: 'tool_call',
        tool_id: TOOL_ID_EVENTS_WRITE,
        tool_call_id: 'ew-bulk',
        params: {
          items: [
            { event_id: 'event-1', status: 'open' },
            { event_id: 'event-2', status: 'open' },
          ],
        },
        results: [
          {
            data: {
              results: [
                {
                  index: 0,
                  event_id: 'event-1',
                  event_uuid: 'uuid-1',
                  written: true,
                },
                { index: 1, event_id: 'event-2', written: false, reason: 'bulk_error' },
              ],
            },
          },
        ],
      },
      {
        type: 'tool_call',
        tool_id: TOOL_ID_EVENTS_WRITE,
        tool_call_id: 'ew-retry',
        params: { items: [{ event_id: 'event-2', status: 'open' }] },
        results: [
          {
            data: {
              results: [
                {
                  index: 0,
                  event_id: 'event-2',
                  event_uuid: 'uuid-2',
                  written: true,
                },
              ],
            },
          },
        ],
      },
    ];

    expect(extractSignificantEventsFromToolCall(steps)).toEqual([
      expect.objectContaining({ event_id: 'event-1', event_uuid: 'uuid-1' }),
      expect.objectContaining({ event_id: 'event-2', event_uuid: 'uuid-2' }),
    ]);
    expect(extractSignificantEventsFromToolCall(steps)[0]).not.toHaveProperty('written');
  });

  it('skips reordered event bulk results', () => {
    const steps: ConverseStep[] = [
      {
        type: 'tool_call',
        tool_id: TOOL_ID_EVENTS_WRITE,
        tool_call_id: 'ew-reordered',
        params: {
          items: [
            { event_id: 'event-1', status: 'open' },
            { event_id: 'event-2', status: 'open' },
          ],
        },
        results: [
          {
            data: {
              results: [
                {
                  index: 1,
                  event_id: 'event-2',
                  event_uuid: 'uuid-2',
                  written: true,
                },
                {
                  index: 0,
                  event_id: 'event-1',
                  event_uuid: 'uuid-1',
                  written: true,
                },
              ],
            },
          },
        ],
      },
    ];

    expect(extractSignificantEventsFromToolCall(steps)).toEqual([]);
  });
});
