/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SignificantEvent } from '@kbn/significant-events-schema';
import type { ContinuationCycle } from './continuation_stability';
import { scoreContinuationNarrativeEvolution } from './continuation_narrative_evolution';

type Signal = NonNullable<SignificantEvent['signals']>[number];

const signal = (ruleUuid: string, verdict: string): Signal =>
  ({ verdict, metadata: { rule_uuid: ruleUuid } } as unknown as Signal);

const event = (overrides: Partial<SignificantEvent>): Partial<SignificantEvent> => ({
  event_id: 'event-1',
  title: 'Storage — timeouts',
  summary: 'Storage times out. Exports fail.',
  symptom_hypothesis: 'Storage is slow. Exports wait on it.',
  assessment_note: 'High: one path. Confidence is 60.0%.',
  severity: 'high',
  signals: [signal('rule-a', 'confirms')],
  ...overrides,
});

const cycles = (...items: Array<Partial<SignificantEvent>>): ContinuationCycle[] =>
  items.map((item) => ({ producedEventIds: ['event-1'], narrativeEvents: [item] }));

describe('scoreContinuationNarrativeEvolution', () => {
  it('abstains until an event is written twice', () => {
    expect(scoreContinuationNarrativeEvolution(cycles(event({}))).score).toBeNull();
  });

  it('accepts an extension after the stored wording and a re-reasoned note for a new rule', () => {
    const result = scoreContinuationNarrativeEvolution(
      cycles(
        event({}),
        event({
          summary: 'Storage times out. Exports fail. Retries follow.',
          symptom_hypothesis: 'Storage is slow. Exports wait on it. Retries pile up.',
          assessment_note: 'High: two paths. Confidence is 65.0%.',
          signals: [signal('rule-a', 'confirms'), signal('rule-b', 'confirms')],
        })
      )
    );
    expect(result.score).toBe(1);
    expect(result.evolution[0]).toContain('+1 rule(s)');
    expect(result.evolution[0]).toContain('changed summary, symptom_hypothesis, assessment_note');
  });

  it('flags a changed title and a stale note beside a new rule', () => {
    const result = scoreContinuationNarrativeEvolution(
      cycles(
        event({}),
        event({
          title: 'Storage — slow',
          signals: [signal('rule-a', 'confirms'), signal('rule-b', 'confirms')],
        })
      )
    );
    expect([result.passedChecks, result.comparableChecks]).toEqual([1, 3]);
    expect(result.explanation).toContain('title changed');
    expect(result.explanation).toContain(
      'assessment_note is unchanged although a rule newly confirms'
    );
  });

  it('flags a summary that keeps only the stored opening sentence', () => {
    const result = scoreContinuationNarrativeEvolution(
      cycles(event({}), event({ summary: 'Storage times out. Something else entirely.' }))
    );
    expect(result.score).toBeLessThan(1);
    expect(result.explanation).toContain('summary was rewritten');
  });

  it('accepts new text added inside its part, with the stored text reflowed into paragraphs', () => {
    const result = scoreContinuationNarrativeEvolution(
      cycles(
        event({ summary: 'Storage times out. Exports fail. First seen 03-07 09:20 UTC.' }),
        event({
          summary:
            'Storage times out.\n\nExports fail. Retries follow.\n\nFirst seen 03-07 09:20 UTC.',
        })
      )
    );
    expect(result.score).toBe(1);
  });

  it('keeps a stored summary whole when it holds an abbreviation and a decimal count', () => {
    const summary = 'Retries use backoff, e.g. exponential. Timeouts reach 2.5k lines.';
    const result = scoreContinuationNarrativeEvolution(
      cycles(event({ summary }), event({ summary: `${summary} Exports also stall.` }))
    );
    expect(result.score).toBe(1);
  });

  it('flags a summary that drops the sentence after an abbreviation', () => {
    const result = scoreContinuationNarrativeEvolution(
      cycles(
        event({ summary: 'Retries use backoff, e.g. exponential. Timeouts reach 2.5k lines.' }),
        event({ summary: 'Retries use backoff, e.g. exponential.' })
      )
    );
    expect(result.score).toBeLessThan(1);
  });

  it('flags an unchanged note when only the severity changed', () => {
    const result = scoreContinuationNarrativeEvolution(
      cycles(event({ severity: 'medium' }), event({ severity: 'high' }))
    );
    expect(result.explanation).toContain('assessment_note is unchanged although severity changed');
  });

  it('accepts a re-reasoned note when the severity changed', () => {
    const result = scoreContinuationNarrativeEvolution(
      cycles(
        event({ severity: 'medium' }),
        event({ severity: 'high', assessment_note: 'High: now spreading. Confidence is 70.0%.' })
      )
    );
    expect(result.score).toBe(1);
  });

  it('reports a rephrased hypothesis without scoring it', () => {
    const result = scoreContinuationNarrativeEvolution(
      cycles(event({}), event({ symptom_hypothesis: 'Slow storage holds exports back.' }))
    );
    expect(result.score).toBe(1);
    expect(result.evolution[0]).toContain('changed symptom_hypothesis');
  });

  it('leaves the note alone when the new rule does not confirm', () => {
    const result = scoreContinuationNarrativeEvolution(
      cycles(
        event({}),
        event({ signals: [signal('rule-a', 'confirms'), signal('rule-b', 'off_topic')] })
      )
    );
    expect(result.score).toBe(1);
    expect(result.evolution[0]).toContain('(1 not confirming)');
  });

  it('flags an unchanged note when a rule held as off_topic now confirms', () => {
    const result = scoreContinuationNarrativeEvolution(
      cycles(
        event({ signals: [signal('rule-a', 'off_topic')] }),
        event({ signals: [signal('rule-a', 'confirms')] })
      )
    );
    expect([result.passedChecks, result.comparableChecks]).toEqual([0, 1]);
    expect(result.explanation).toContain(
      'assessment_note is unchanged although a rule newly confirms'
    );
  });

  it('allows a rewrite when a rule held as off_topic now confirms', () => {
    const result = scoreContinuationNarrativeEvolution(
      cycles(
        event({ signals: [signal('rule-a', 'off_topic')] }),
        event({
          summary: 'A different, better-grounded account.',
          symptom_hypothesis: 'A different mechanism.',
          assessment_note: 'High: now confirmed. Confidence is 70.0%.',
          signals: [signal('rule-a', 'confirms')],
        })
      )
    );
    expect(result.score).toBe(1);
  });

  it('allows the title to change when a rule held as off_topic now confirms', () => {
    const result = scoreContinuationNarrativeEvolution(
      cycles(
        event({ signals: [signal('rule-a', 'off_topic')] }),
        event({
          title: 'Storage — connection refused',
          assessment_note: 'High: now confirmed. Confidence is 70.0%.',
          signals: [signal('rule-a', 'confirms')],
        })
      )
    );
    expect(result.score).toBe(1);
  });

  it('compares a continuation against a successfully created event', () => {
    const result = scoreContinuationNarrativeEvolution([
      {
        producedEventIds: ['event-1'],
        narrativeEvents: [event({})],
      },
      {
        producedEventIds: ['event-1'],
        narrativeEvents: [event({ summary: 'Storage times out. Exports fail. Retries follow.' })],
      },
    ]);
    expect(result.score).toBe(1);
  });

  it('does not use a rejected create request as the stored narrative baseline', () => {
    const result = scoreContinuationNarrativeEvolution([
      {
        producedEventIds: ['event-1'],
        writeItems: [event({ event_id: undefined, summary: 'Rejected request narrative.' })],
        narrativeEvents: [],
      },
      {
        producedEventIds: ['event-1'],
        narrativeEvents: [event({ summary: 'Storage times out. Exports fail. Retries follow.' })],
      },
    ]);

    expect(result.score).toBeNull();
  });

  it('uses the post-override seeded event as the first-cycle baseline', () => {
    const result = scoreContinuationNarrativeEvolution([
      {
        producedEventIds: ['event-1'],
        writeItems: [event({})],
        narrativeEvents: [
          event({
            title: 'Batch exporter — HTTP 504',
            summary: 'Export requests return HTTP 504.',
            signals: [signal('rule-a', 'off_topic')],
          }),
        ],
      },
      {
        producedEventIds: ['event-1'],
        narrativeEvents: [
          event({
            title: 'Storage — connection refused',
            summary: 'Storage connection failures block checkout.',
            assessment_note: 'High: now confirmed. Confidence is 70.0%.',
            signals: [signal('rule-a', 'confirms')],
          }),
        ],
      },
    ]);

    expect(result.score).toBe(1);
  });

  it('does not treat a returning confirmed rule as newly confirming', () => {
    const result = scoreContinuationNarrativeEvolution(
      cycles(
        event({ signals: [signal('rule-a', 'confirms')] }),
        event({
          assessment_note: 'High: rule-b confirms. Confidence is 60.0%.',
          signals: [signal('rule-b', 'confirms')],
        }),
        event({ signals: [signal('rule-a', 'confirms')] })
      )
    );
    expect(result.score).toBe(1);
  });
});
