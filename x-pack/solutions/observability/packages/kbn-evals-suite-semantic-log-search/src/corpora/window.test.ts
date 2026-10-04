/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CORPORA } from '.';
import type { CorpusProfile } from './types';
import { resolveCorpusWindow } from './window';

const corpus = CORPORA.sigevents_postgres_timeout;
const NOW = new Date('2026-09-22T13:00:00.000Z');

describe('resolveCorpusWindow', () => {
  it('resolves a relative window to absolute ISO timestamps', () => {
    const resolved = resolveCorpusWindow(corpus, NOW);

    expect(resolved.timeRange).toEqual({
      start: '2026-09-22T11:00:00.000Z',
      end: '2026-09-22T13:00:00.000Z',
    });
  });

  it('resolves both bounds against the same instant', () => {
    // Regression: the profiles are authored as `now-2h` / `now`, which was previously re-evaluated
    // per request. Three consecutive runs against one unchanged seed audited 2,593, then 2,447,
    // then 2,333 documents, because data aged out between them.
    const resolved = resolveCorpusWindow(corpus, NOW);
    const spanMs =
      new Date(resolved.timeRange.end).getTime() - new Date(resolved.timeRange.start).getTime();

    expect(spanMs).toBe(2 * 60 * 60 * 1000);
  });

  it('leaves everything except the time range untouched', () => {
    const resolved = resolveCorpusWindow(corpus, NOW);

    expect(resolved.id).toBe(corpus.id);
    expect(resolved.target).toBe(corpus.target);
    expect(resolved.queries).toBe(corpus.queries);
    expect(resolved.messageClasses).toBe(corpus.messageClasses);
    expect(resolved.maxPatterns).toBe(corpus.maxPatterns);
  });

  it('is idempotent, so an already absolute window survives a second pass', () => {
    const once = resolveCorpusWindow(corpus, NOW);
    const twice = resolveCorpusWindow(once, new Date('2027-01-01T00:00:00.000Z'));

    expect(twice.timeRange).toEqual(once.timeRange);
  });

  it('throws on an unparseable bound rather than returning an invalid date', () => {
    // ISO-shaped but impossible, so moment rejects it in ISO mode rather than falling back to
    // `Date` parsing and emitting a deprecation warning on every test run.
    const broken: CorpusProfile = {
      ...corpus,
      timeRange: { start: '2026-13-45T99:99:99.000Z', end: 'now' },
    };

    expect(() => resolveCorpusWindow(broken, NOW)).toThrow(/unparseable time range/);
  });

  it('throws on an inverted window', () => {
    const inverted: CorpusProfile = {
      ...corpus,
      timeRange: { start: 'now', end: 'now-2h' },
    };

    expect(() => resolveCorpusWindow(inverted, NOW)).toThrow(/empty or inverted window/);
  });

  it('throws when the window is a single instant', () => {
    const empty: CorpusProfile = { ...corpus, timeRange: { start: 'now', end: 'now' } };

    expect(() => resolveCorpusWindow(empty, NOW)).toThrow(/empty or inverted window/);
  });
});
