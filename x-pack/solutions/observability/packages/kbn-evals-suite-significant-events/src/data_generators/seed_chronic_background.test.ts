/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  buildChronicDocument,
  kiQueryFor,
  seedTimestamps,
  type ChronicSeedConfig,
} from './seed_chronic_background';

const NOW = Date.parse('2026-10-23T12:00:00.000Z');
const MINUTE = 60_000;

describe('seedTimestamps', () => {
  it('seeds a steady rate over one segment, oldest first, ending before now', () => {
    const timestamps = seedTimestamps({
      now: NOW,
      segments: [{ from_minutes_ago: 60, to_minutes_ago: 0, rate_per_minute: 2 }],
    });

    expect(timestamps).toHaveLength(120);
    expect(timestamps[0]).toBe(NOW - 60 * MINUTE);
    expect(timestamps[timestamps.length - 1]).toBeLessThan(NOW);
    expect([...timestamps].sort((a, b) => a - b)).toEqual(timestamps);
  });

  it('seeds each segment at its own rate, so a surge is rate times longer', () => {
    const timestamps = seedTimestamps({
      now: NOW,
      segments: [
        { from_minutes_ago: 200, to_minutes_ago: 100, rate_per_minute: 1 },
        { from_minutes_ago: 100, to_minutes_ago: 0, rate_per_minute: 20 },
      ],
    });

    const inSurge = timestamps.filter((ts) => ts >= NOW - 100 * MINUTE).length;
    expect(timestamps.length - inSurge).toBe(100);
    expect(inSurge).toBe(2000);
  });

  it.each([
    [
      'an empty or reversed segment',
      { from_minutes_ago: 10, to_minutes_ago: 10, rate_per_minute: 1 },
    ],
    ['a rate of zero', { from_minutes_ago: 10, to_minutes_ago: 0, rate_per_minute: 0 }],
  ])('rejects %s', (_name, segment) => {
    expect(() => seedTimestamps({ now: NOW, segments: [segment] })).toThrow(/positive rate/);
  });
});

describe('kiQueryFor', () => {
  it('matches the phrase exactly, not any of its words, so scenarios on one stream stay apart', () => {
    const query = kiQueryFor({
      streamName: 'logs',
      phrase: 'payment authorization request failed',
    });

    expect(query).toBe(
      'FROM logs, logs.* | WHERE MATCH_PHRASE(body.text, "payment authorization request failed")'
    );
    expect(query).not.toContain('body.text :');
  });
});

describe('buildChronicDocument', () => {
  const config: ChronicSeedConfig = {
    phrase: 'task nudge poll failed',
    service: 'probe',
    segments: [],
    detection_offset_minutes: 30,
    ki_title: 'title',
    ki_description: 'description',
  };
  const timestamp = Date.parse('2026-10-23T12:00:00.000Z');

  it('writes an ERROR app log line by default', () => {
    expect(buildChronicDocument({ config, timestamp })).toEqual({
      '@timestamp': '2026-10-23T12:00:00.000Z',
      body: { text: 'probe | task nudge poll failed' },
      severity_text: 'ERROR',
      attributes: {},
      resource: { attributes: { 'service.name': 'probe' } },
    });
  });

  it('carries its extra fields and leaves the level out when it is null', () => {
    const document = buildChronicDocument({
      config: { ...config, level: null, attributes: { 'error.exception.handled': true } },
      timestamp,
    });

    expect(document).toMatchObject({ attributes: { 'error.exception.handled': true } });
    expect(document).not.toHaveProperty('severity_text');
  });
});
