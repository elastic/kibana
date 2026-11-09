/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lintWikiContent } from '@kbn/nightshift-investigations-plugin/server/wiki/lint_content';
import type {
  WikiOptimizeEvaluator,
  WikiOptimizeTaskOutput,
  WikiPageEffect,
  WikiPageMatch,
  WikiPageSnapshot,
  WikiReplayExpected,
} from './types';

const pageText = ({ slug, title, content }: WikiPageSnapshot): string =>
  `${slug}\n${title}\n${content}`.toLowerCase();

/** A term is present when the text holds it, or any of its `|`-separated alternatives, ignoring case. */
export const hasTerm = (text: string, term: string): boolean => {
  const lowered = text.toLowerCase();
  return term.split('|').some((alternative) => lowered.includes(alternative.trim().toLowerCase()));
};

const matchesPage = (page: WikiPageSnapshot, { entity_type: entityType, terms }: WikiPageMatch) =>
  (entityType === undefined || page.entity_type === entityType) &&
  terms.every((term) => hasTerm(pageText(page), term));

const describeMatch = ({ entity_type: entityType, terms }: WikiPageMatch): string =>
  `${entityType ?? 'any page'} with ${terms.map((term) => `"${term}"`).join(' and ')}`;

/** The text under the first `##` heading containing `section`, up to the next heading. */
export const sectionBody = (content: string, section: string): string | undefined => {
  const lines = content.split('\n');
  const wanted = section.toLowerCase();
  const start = lines.findIndex((line) => {
    const heading = /^#{2,}\s+(.*)$/.exec(line);
    return heading !== null && heading[1].toLowerCase().includes(wanted);
  });
  if (start === -1) {
    return undefined;
  }
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((line) => /^#{1,2}\s/.test(line));
  return (end === -1 ? rest : rest.slice(0, end)).join('\n');
};

const isUnchanged = (before: WikiPageSnapshot, after: WikiPageSnapshot): boolean =>
  before.status === after.status &&
  before.corroborations === after.corroborations &&
  before.content === after.content;

/** Pages the replay created or changed, as they stand at the end. */
export const writtenPages = ({
  pages,
  rounds,
}: Pick<WikiOptimizeTaskOutput, 'pages' | 'rounds'>): WikiPageSnapshot[] => {
  const seeded = new Map((rounds[0]?.pages_before ?? []).map((page) => [page.id, page]));
  return pages.filter((page) => {
    const original = seeded.get(page.id);
    return original === undefined || !isUnchanged(original, page);
  });
};

const failed = (output: WikiOptimizeTaskOutput) =>
  output.error === undefined
    ? undefined
    : { score: 0, explanation: `The replay failed: ${output.error}` };

const notApplicable = (explanation: string) => ({ score: null, explanation });

const ratio = (met: number, total: number): number => (total === 0 ? 1 : met / total);

const effectHolds = (
  effect: WikiPageEffect,
  match: WikiPageMatch,
  before: WikiPageSnapshot[],
  after: WikiPageSnapshot[]
): boolean => {
  const beforeById = new Map(before.map((page) => [page.id, page]));
  const matching = after.filter((page) => matchesPage(page, match));
  switch (effect) {
    case 'created':
      return matching.some((page) => !beforeById.has(page.id));
    case 'corroborated':
      return matching.some((page) => {
        const previous = beforeById.get(page.id);
        return previous !== undefined && page.corroborations > previous.corroborations;
      });
    case 'rewritten':
      return matching.some((page) => {
        const previous = beforeById.get(page.id);
        return previous !== undefined && page.content !== previous.content;
      });
    case 'archived':
      return matching.some((page) => {
        const previous = beforeById.get(page.id);
        return (
          page.status === 'archived' && previous !== undefined && previous.status !== 'archived'
        );
      });
    case 'revised':
      return before
        .filter((page) => matchesPage(page, match))
        .some((previous) => {
          const current = after.find(({ id }) => id === previous.id);
          return (
            current !== undefined &&
            (current.content !== previous.content ||
              (current.status === 'archived' && previous.status !== 'archived'))
          );
        });
    case 'untouched': {
      const existing = before.filter((page) => matchesPage(page, match));
      return (
        existing.length > 0 &&
        existing.every((page) => {
          const current = after.find(({ id }) => id === page.id);
          return current !== undefined && isUnchanged(page, current);
        })
      );
    }
  }
};

/** Durable knowledge the example expects is on a page of the right type, and section when given. */
export const captureRecallEvaluator: WikiOptimizeEvaluator = {
  name: 'capture_recall',
  kind: 'CODE',
  direction: 'maximize',
  evaluate: async ({ output, expected }) => {
    const { must_capture: captures } = expected as WikiReplayExpected;
    if (captures.length === 0) {
      return notApplicable('The example expects no specific knowledge.');
    }
    const error = failed(output);
    if (error) {
      return error;
    }
    // An archived page is not materialized for the investigator, so it holds no usable knowledge.
    const written = writtenPages(output).filter(({ status }) => status !== 'archived');
    const missing = captures.filter(
      (capture) =>
        !written.some((page) => {
          if (capture.entity_type !== undefined && page.entity_type !== capture.entity_type) {
            return false;
          }
          const scope =
            capture.section === undefined
              ? page.content
              : sectionBody(page.content, capture.section);
          return scope !== undefined && capture.terms.every((term) => hasTerm(scope, term));
        })
    );
    const met = captures.length - missing.length;
    return {
      score: ratio(met, captures.length),
      explanation:
        missing.length === 0
          ? `All ${captures.length} expected item(s) are on a page.`
          : `Missing ${missing.length} of ${captures.length}: ${missing
              .map(
                (capture) =>
                  `${describeMatch(capture)}${capture.section ? ` under "${capture.section}"` : ''}`
              )
              .join('; ')}.`,
      metadata: { met, total: captures.length },
    };
  },
};

/** Pages the optimizer wrote carry no single-occurrence detail such as a date, id or count. */
export const nonTemporalEvaluator: WikiOptimizeEvaluator = {
  name: 'non_temporal',
  kind: 'CODE',
  direction: 'maximize',
  evaluate: async ({ output }) => {
    const error = failed(output);
    if (error) {
      return error;
    }
    const written = writtenPages(output);
    if (written.length === 0) {
      return notApplicable('The optimizer wrote no pages.');
    }
    // The optimizer keeps pages with non-blocking findings, so this score is what tells a regression
    // there apart from a dropped edit. A replica count is a fact about the system, not an occurrence.
    const dirty = written.flatMap((page) => {
      const violations = lintWikiContent(`${page.slug}\n${page.title}\n${page.content}`).filter(
        ({ rule }) => rule !== 'replica_count'
      );
      return violations.length === 0 ? [] : [{ page: page.slug, violations }];
    });
    return {
      score: ratio(written.length - dirty.length, written.length),
      explanation:
        dirty.length === 0
          ? `${written.length} written page(s) are free of dates, ids and counts.`
          : dirty
              .map(
                ({ page, violations }) =>
                  `${page}: ${violations.map(({ rule, match }) => `${rule} "${match}"`).join(', ')}`
              )
              .join('; '),
      metadata: { written: written.length, dirty: dirty.length },
    };
  },
};

/** No page carries a case-specific detail the example lists, such as a cause or a count. */
export const mustNotAbsentEvaluator: WikiOptimizeEvaluator = {
  name: 'must_not_absent',
  kind: 'CODE',
  direction: 'maximize',
  evaluate: async ({ output, expected }) => {
    const { must_not: forbidden } = expected as WikiReplayExpected;
    if (forbidden.length === 0) {
      return notApplicable('The example lists no forbidden details.');
    }
    const error = failed(output);
    if (error) {
      return error;
    }
    const written = writtenPages(output);
    const found = forbidden.filter((detail) =>
      written.some((page) => pageText(page).includes(detail.toLowerCase()))
    );
    return {
      score: found.length === 0 ? 1 : 0,
      explanation:
        found.length === 0
          ? 'No forbidden detail appears on a written page.'
          : `Pages contain: ${found.map((detail) => `"${detail}"`).join(', ')}.`,
      metadata: { found },
    };
  },
};

/** Each round does what the example expects to matching pages: create, corroborate, archive, keep. */
export const effectsMetEvaluator: WikiOptimizeEvaluator = {
  name: 'effects_met',
  kind: 'CODE',
  direction: 'maximize',
  evaluate: async ({ output, expected }) => {
    const { effects } = expected as WikiReplayExpected;
    if (effects.length === 0) {
      return notApplicable('The example expects no specific page effects.');
    }
    const error = failed(output);
    if (error) {
      return error;
    }
    const unmet = effects.filter(({ round, match, effect }) => {
      const result = output.rounds[round];
      return (
        result === undefined || !effectHolds(effect, match, result.pages_before, result.pages_after)
      );
    });
    return {
      score: ratio(effects.length - unmet.length, effects.length),
      explanation:
        unmet.length === 0
          ? `All ${effects.length} expected effect(s) happened.`
          : `Not met: ${unmet
              .map(
                ({ round, match, effect }) => `${effect} ${describeMatch(match)} in round ${round}`
              )
              .join('; ')}.`,
      metadata: { met: effects.length - unmet.length, total: effects.length },
    };
  },
};

/** The optimizer writes no more pages than expected and opens no near-duplicate of a described page. */
export const pageBoundsEvaluator: WikiOptimizeEvaluator = {
  name: 'page_bounds',
  kind: 'CODE',
  direction: 'maximize',
  evaluate: async ({ output, expected }) => {
    const { max_pages_written: maxWritten, max_pages_matching: maxMatching } =
      expected as WikiReplayExpected;
    if (maxWritten === undefined && maxMatching.length === 0) {
      return notApplicable('The example sets no page bounds.');
    }
    const error = failed(output);
    if (error) {
      return error;
    }
    const written = writtenPages(output);
    const problems = [
      ...(maxWritten !== undefined && written.length > maxWritten
        ? [`wrote ${written.length} page(s), at most ${maxWritten} expected`]
        : []),
      ...maxMatching.flatMap(({ match, max }) => {
        const count = output.pages.filter((page) => matchesPage(page, match)).length;
        return count > max ? [`${count} pages match ${describeMatch(match)}, at most ${max}`] : [];
      }),
    ];
    return {
      score: problems.length === 0 ? 1 : 0,
      explanation: problems.length === 0 ? 'Page counts are within bounds.' : problems.join('; '),
      metadata: { written: written.length },
    };
  },
};

/** A page created in a round starts tentative: one run cannot publish a fact as established. */
export const newPagesTentativeEvaluator: WikiOptimizeEvaluator = {
  name: 'new_pages_tentative',
  kind: 'CODE',
  direction: 'maximize',
  evaluate: async ({ output }) => {
    const error = failed(output);
    if (error) {
      return error;
    }
    const created = output.rounds.flatMap(({ pages_before: before, pages_after: after }) => {
      const known = new Set(before.map(({ id }) => id));
      return after.filter(({ id }) => !known.has(id));
    });
    if (created.length === 0) {
      return notApplicable('No page was created.');
    }
    const premature = created.filter(({ status }) => status !== 'tentative');
    return {
      score: ratio(created.length - premature.length, created.length),
      explanation:
        premature.length === 0
          ? `${created.length} new page(s) all started tentative.`
          : `Created as ${premature.map(({ slug, status }) => `${slug} (${status})`).join(', ')}.`,
    };
  },
};

export const wikiOptimizeEvaluators: WikiOptimizeEvaluator[] = [
  captureRecallEvaluator,
  nonTemporalEvaluator,
  mustNotAbsentEvaluator,
  effectsMetEvaluator,
  pageBoundsEvaluator,
  newPagesTentativeEvaluator,
];
