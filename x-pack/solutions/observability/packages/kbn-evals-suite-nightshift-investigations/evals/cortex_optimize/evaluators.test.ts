/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  captureRecallEvaluator,
  effectsMetEvaluator,
  hasTerm,
  mustNotAbsentEvaluator,
  newPagesTentativeEvaluator,
  nonTemporalEvaluator,
  pageBoundsEvaluator,
  sectionBody,
  writtenPages,
} from './evaluators';
import type {
  CortexOptimizeEvaluator,
  CortexOptimizeTaskOutput,
  CortexPageSnapshot,
  CortexReplayExpected,
} from './types';

const page = (overrides: Partial<CortexPageSnapshot> = {}): CortexPageSnapshot => ({
  id: 'cortex_service_checkout-api',
  entity_type: 'service',
  slug: 'checkout-api',
  title: 'checkout-api',
  status: 'tentative',
  corroborations: 0,
  content: '## Dependencies\n- session-cache\n\n## Failure modes\n- slow when the cache is cold',
  ...overrides,
});

const expectedOf = (overrides: Partial<CortexReplayExpected> = {}): CortexReplayExpected => ({
  must_capture: [],
  must_not: [],
  effects: [],
  max_pages_matching: [],
  ...overrides,
});

const outputOf = (
  rounds: Array<{ before: CortexPageSnapshot[]; after: CortexPageSnapshot[] }>,
  overrides: Partial<CortexOptimizeTaskOutput> = {}
): CortexOptimizeTaskOutput => ({
  case_id: 'case',
  rounds: rounds.map(({ before, after }) => ({
    kind: 'initial',
    transcript: '',
    proposed_edits: [],
    pages_before: before,
    pages_after: after,
  })),
  pages: rounds.length > 0 ? rounds[rounds.length - 1].after : [],
  seeded_ids: [],
  ...overrides,
});

const run = (
  evaluator: CortexOptimizeEvaluator,
  output: CortexOptimizeTaskOutput,
  expected: CortexReplayExpected
) =>
  evaluator.evaluate({
    input: { rounds: [], seed_pages: [] },
    output,
    expected,
    metadata: { case_id: 'case', kind: 'noop' },
  } as never);

describe('hasTerm', () => {
  it('matches a term ignoring case', () => {
    expect(hasTerm('Narrow the window and retry', 'NARROW')).toBe(true);
  });

  it('matches when any `|`-separated alternative is present', () => {
    expect(hasTerm('the call timed out', 'timeout|timed out')).toBe(true);
    expect(hasTerm('the call failed', 'timeout|timed out')).toBe(false);
  });
});

describe('sectionBody', () => {
  it('returns the text under a heading until the next heading', () => {
    expect(sectionBody(page().content, 'dependencies')).toBe('- session-cache\n');
  });

  it('matches a heading that contains the section name', () => {
    expect(sectionBody('## Upstream/Downstream dependencies\n- a', 'dependencies')).toBe('- a');
  });

  it('returns undefined when the heading is missing', () => {
    expect(sectionBody(page().content, 'Tool failures')).toBeUndefined();
  });
});

describe('writtenPages', () => {
  it('leaves out seeded pages the replay did not change', () => {
    const seeded = page({ slug: 'seeded', id: 'cortex_service_seeded' });
    const created = page();

    const written = writtenPages(
      outputOf([{ before: [seeded], after: [seeded, created] }], { pages: [seeded, created] })
    );

    expect(written).toEqual([created]);
  });

  it('includes a seeded page the replay corroborated', () => {
    const seeded = page();
    const after = page({ corroborations: 1 });

    expect(writtenPages(outputOf([{ before: [seeded], after: [after] }]))).toEqual([after]);
  });
});

describe('captureRecallEvaluator', () => {
  it('is not applicable when nothing is expected', async () => {
    const result = await run(
      captureRecallEvaluator,
      outputOf([{ before: [], after: [] }]),
      expectedOf()
    );

    expect(result.score).toBeNull();
  });

  it('scores the share of expected items found in the right type and section', async () => {
    const output = outputOf([{ before: [], after: [page()] }]);

    const result = await run(
      captureRecallEvaluator,
      output,
      expectedOf({
        must_capture: [
          { entity_type: 'service', section: 'dependencies', terms: ['session-cache'] },
          { entity_type: 'ontology', section: 'relations', terms: ['session-cache'] },
        ],
      })
    );

    expect(result.score).toBe(0.5);
    expect(result.explanation).toContain('ontology');
  });

  it('does not count a term found outside the expected section', async () => {
    const output = outputOf([{ before: [], after: [page()] }]);

    const result = await run(
      captureRecallEvaluator,
      output,
      expectedOf({
        must_capture: [
          { entity_type: 'service', section: 'dependencies', terms: ['cache is cold'] },
        ],
      })
    );

    expect(result.score).toBe(0);
  });

  it('does not count knowledge that a later round archived', async () => {
    const created = page();
    const result = await run(
      captureRecallEvaluator,
      outputOf([
        { before: [], after: [created] },
        { before: [created], after: [{ ...created, status: 'archived' }] },
      ]),
      expectedOf({
        must_capture: [
          { entity_type: 'service', section: 'dependencies', terms: ['session-cache'] },
        ],
      })
    );

    expect(result.score).toBe(0);
  });

  it('fails when the replay failed', async () => {
    const result = await run(
      captureRecallEvaluator,
      outputOf([], { error: 'model unavailable' }),
      expectedOf({ must_capture: [{ terms: ['x'] }] })
    );

    expect(result.score).toBe(0);
    expect(result.explanation).toContain('model unavailable');
  });
});

describe('nonTemporalEvaluator', () => {
  it('passes pages free of dates, ids and counts', async () => {
    const result = await run(
      nonTemporalEvaluator,
      outputOf([{ before: [], after: [page()] }]),
      expectedOf()
    );

    expect(result.score).toBe(1);
  });

  it('scores the share of written pages that are clean', async () => {
    const dirty = page({
      id: 'cortex_service_b',
      slug: 'b',
      content: '## Failure modes\n- failed on 2026-03-02 with 5,944 errors',
    });

    const result = await run(
      nonTemporalEvaluator,
      outputOf([{ before: [], after: [page(), dirty] }]),
      expectedOf()
    );

    expect(result.score).toBe(0.5);
    expect(result.explanation).toContain('iso_timestamp');
  });

  it.each(['It logged 5,944 errors on one node.', 'Check the logs from the last hour.'])(
    'counts a page that carries %s even though the optimizer keeps it',
    async (text) => {
      const result = await run(
        nonTemporalEvaluator,
        outputOf([{ before: [], after: [page({ content: `## Failure modes\n${text}` })] }]),
        expectedOf()
      );

      expect(result.score).toBe(0);
    }
  );

  it('does not count a replica count against a page, since it describes the system', async () => {
    const withReplicas = page({ content: '## Telemetry\nRuns as about 32 pods.' });

    const result = await run(
      nonTemporalEvaluator,
      outputOf([{ before: [], after: [withReplicas] }]),
      expectedOf()
    );

    expect(result.score).toBe(1);
  });

  it('is not applicable when the optimizer wrote nothing', async () => {
    const result = await run(
      nonTemporalEvaluator,
      outputOf([{ before: [], after: [] }]),
      expectedOf()
    );

    expect(result.score).toBeNull();
  });
});

describe('mustNotAbsentEvaluator', () => {
  it('fails when a written page holds a forbidden detail, ignoring case', async () => {
    const result = await run(
      mustNotAbsentEvaluator,
      outputOf([{ before: [], after: [page()] }]),
      expectedOf({ must_not: ['Cache Is Cold'] })
    );

    expect(result.score).toBe(0);
  });

  it('passes when none appears', async () => {
    const result = await run(
      mustNotAbsentEvaluator,
      outputOf([{ before: [], after: [page()] }]),
      expectedOf({ must_not: ['payments'] })
    );

    expect(result.score).toBe(1);
  });
});

describe('effectsMetEvaluator', () => {
  const match = { terms: ['session-cache'] };

  it.each([
    ['created', [], [page()], true],
    ['created', [page()], [page()], false],
    ['corroborated', [page()], [page({ corroborations: 1 })], true],
    ['corroborated', [page()], [page()], false],
    ['archived', [page()], [page({ status: 'archived' })], true],
    ['archived', [page()], [page()], false],
    ['rewritten', [page()], [page({ content: '## Dependencies\n- session-cache v2' })], true],
    ['revised', [page()], [page({ status: 'archived' })], true],
    ['revised', [page()], [page({ content: '## Dependencies\n- session-cache v2' })], true],
    ['revised', [page()], [page({ corroborations: 1 })], false],
    ['untouched', [page()], [page()], true],
    ['untouched', [page()], [page({ corroborations: 1 })], false],
  ] as const)('%s with %j then %j holds: %s', async (effect, before, after, holds) => {
    const result = await run(
      effectsMetEvaluator,
      outputOf([{ before: [...before], after: [...after] }]),
      expectedOf({ effects: [{ match, round: 0, effect }] })
    );

    expect(result.score).toBe(holds ? 1 : 0);
  });

  it('checks the round the effect names', async () => {
    const result = await run(
      effectsMetEvaluator,
      outputOf([
        { before: [], after: [page()] },
        { before: [page()], after: [page({ corroborations: 1 })] },
      ]),
      expectedOf({ effects: [{ match, round: 1, effect: 'corroborated' }] })
    );

    expect(result.score).toBe(1);
  });
});

describe('pageBoundsEvaluator', () => {
  it('fails when more pages were written than allowed', async () => {
    const result = await run(
      pageBoundsEvaluator,
      outputOf([{ before: [], after: [page()] }]),
      expectedOf({ max_pages_written: 0 })
    );

    expect(result.score).toBe(0);
  });

  it('fails when near-duplicate pages match the same description', async () => {
    const second = page({ id: 'cortex_service_other', slug: 'other' });

    const result = await run(
      pageBoundsEvaluator,
      outputOf([{ before: [], after: [page(), second] }]),
      expectedOf({ max_pages_matching: [{ match: { terms: ['session-cache'] }, max: 1 }] })
    );

    expect(result.score).toBe(0);
  });

  it('passes when within bounds', async () => {
    const result = await run(
      pageBoundsEvaluator,
      outputOf([{ before: [], after: [page()] }]),
      expectedOf({ max_pages_written: 1 })
    );

    expect(result.score).toBe(1);
  });
});

describe('newPagesTentativeEvaluator', () => {
  it('fails a page created as established', async () => {
    const result = await run(
      newPagesTentativeEvaluator,
      outputOf([{ before: [], after: [page({ status: 'established' })] }]),
      expectedOf()
    );

    expect(result.score).toBe(0);
  });

  it('passes a page created as tentative', async () => {
    const result = await run(
      newPagesTentativeEvaluator,
      outputOf([{ before: [], after: [page()] }]),
      expectedOf()
    );

    expect(result.score).toBe(1);
  });

  it('is not applicable when no page was created', async () => {
    const result = await run(
      newPagesTentativeEvaluator,
      outputOf([{ before: [page()], after: [page()] }]),
      expectedOf()
    );

    expect(result.score).toBeNull();
  });
});
