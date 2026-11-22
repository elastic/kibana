/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SignificantEvent } from '@kbn/significant-events-schema';
import type { ContinuationCycle, ContinuationEvaluator } from './continuation_stability';

export interface ContinuationNarrativeEvolutionResult {
  score: number | null;
  passedChecks: number;
  comparableChecks: number;
  /** Per continued event, which narrative fields changed against the event's previous write. */
  evolution: string[];
  explanation: string;
}

type WrittenEvent = Partial<SignificantEvent>;

interface RuleVerdicts {
  readonly confirming: ReadonlySet<string>;
  readonly offTopic: ReadonlySet<string>;
  readonly all: ReadonlySet<string>;
}

const ruleVerdicts = (event: WrittenEvent): RuleVerdicts => {
  const confirming = new Set<string>();
  const offTopic = new Set<string>();
  const all = new Set<string>();
  for (const signal of event.signals ?? []) {
    const ruleUuid = signal.metadata?.rule_uuid;
    if (!ruleUuid) continue;
    all.add(ruleUuid);
    if (signal.verdict === 'confirms') confirming.add(ruleUuid);
    if (signal.verdict === 'off_topic') offTopic.add(ruleUuid);
  }
  return { confirming, offTopic, all };
};

/** The wording a reader already knows: the stored text with its whitespace normalised. */
const storedWording = (text: string): string => text.replace(/\s+/g, ' ').trim();

/** A sentence ends at a stop followed by whitespace and the start of a new sentence, so `e.g. foo` and `2.5k` stay whole. */
const SENTENCE_END = /(?<=[.!?])\s+(?=[A-Z0-9`"'([])/;

/**
 * Whether `next` keeps every sentence `previous` says. New text may sit in the part it belongs
 * to, between stored sentences, so the stored text need not survive as one contiguous span; a
 * rewrite drops a sentence the reader already had, so it fails. The check is best-effort: a
 * stored sentence that reappears inside a longer rewritten sentence still counts as kept.
 */
const keepsStoredSentences = (previous: string, next: string): boolean => {
  const kept = storedWording(next);
  return storedWording(previous)
    .split(SENTENCE_END)
    .every((sentence) => kept.includes(sentence));
};

/**
 * Scores how the narrative fields of a continued event evolve across cycles:
 * - the title is preserved verbatim;
 * - `summary` keeps every stored sentence, never rewritten, unless a rule the event held as
 *   `off_topic` now confirms (the stored text described a sampled error);
 * - `assessment_note` is re-reasoned when the evidence behind it changed (a rule that newly
 *   confirms, whether new to the event or moved from another verdict, or a new severity), so a stale
 *   note does not sit beside new evidence. A new rule that does not
 *   confirm changes neither the note nor the text, so it is reported but never scored.
 * Whether the text grew for a new confirming rule is reported per event but not scored: only a
 * signal that helps explain the problem extends it, which a code check cannot tell. A changed
 * `symptom_hypothesis` is reported but not scored either: it may rephrase to stay within three
 * sentences, which a code check cannot tell from a rewrite.
 */
export const scoreContinuationNarrativeEvolution = (
  cycles: ContinuationCycle[]
): ContinuationNarrativeEvolutionResult => {
  const previousByEventId = new Map<string, WrittenEvent>();
  const evolution: string[] = [];
  const issues: string[] = [];
  let passedChecks = 0;
  let comparableChecks = 0;

  const check = (passed: boolean, issue: string) => {
    comparableChecks++;
    if (passed) passedChecks++;
    else issues.push(issue);
  };

  cycles.forEach((cycle, cycleIndex) => {
    for (const event of cycle.writeItems ?? []) {
      const eventId = event.event_id;
      if (!eventId) continue;
      const previous = previousByEventId.get(eventId);
      previousByEventId.set(eventId, event);
      if (!previous) continue;

      const label = `cycle ${cycleIndex}: "${eventId}"`;
      const before = ruleVerdicts(previous);
      const now = ruleVerdicts(event);
      const newRules = [...now.all].filter((ruleUuid) => !before.all.has(ruleUuid));
      const addedConfirmingRules = [...now.confirming].filter(
        (ruleUuid) => !before.all.has(ruleUuid)
      );
      const newlyConfirmingRules = [...now.confirming].filter(
        (ruleUuid) => !before.confirming.has(ruleUuid)
      );
      const rewriteAllowed = [...before.offTopic].some((ruleUuid) => now.confirming.has(ruleUuid));

      if (previous.title !== undefined && event.title !== undefined) {
        check(previous.title === event.title, `${label} title changed`);
      }
      if (previous.summary !== undefined && event.summary !== undefined && !rewriteAllowed) {
        check(
          keepsStoredSentences(previous.summary, event.summary),
          `${label} summary was rewritten`
        );
      }
      const evidenceMoved = newlyConfirmingRules.length > 0 || previous.severity !== event.severity;
      if (evidenceMoved && previous.assessment_note !== undefined) {
        check(
          previous.assessment_note !== event.assessment_note,
          `${label} assessment_note is unchanged although ${
            newlyConfirmingRules.length > 0 ? 'a rule newly confirms' : 'severity changed'
          }`
        );
      }

      const changed = (['summary', 'symptom_hypothesis', 'assessment_note'] as const).filter(
        (field) => previous[field] !== event[field]
      );
      const notConfirming = newRules.length - addedConfirmingRules.length;
      evolution.push(
        `${label} ${newRules.length > 0 ? `+${newRules.length} rule(s)` : 'no new rule'}` +
          `${notConfirming > 0 ? ` (${notConfirming} not confirming)` : ''}: ` +
          (changed.length > 0 ? `changed ${changed.join(', ')}` : 'narrative unchanged')
      );
    }
  });

  if (comparableChecks === 0) {
    return {
      score: null,
      passedChecks: 0,
      comparableChecks: 0,
      evolution,
      explanation: 'No continued event wrote its narrative twice, so there is nothing to compare',
    };
  }

  return {
    score: passedChecks / comparableChecks,
    passedChecks,
    comparableChecks,
    evolution,
    explanation:
      `${passedChecks}/${comparableChecks} narrative check(s) held` +
      (issues.length > 0 ? ` (${issues.join('; ')})` : '') +
      `. Evolution: ${evolution.join(' | ')}`,
  };
};

/** CODE evaluator: continued events keep their title, extend rather than rewrite, and re-reason the note. */
export const continuationNarrativeEvolutionEvaluator: ContinuationEvaluator = {
  name: 'continuation_narrative_evolution',
  kind: 'CODE',
  direction: 'maximize',
  evaluate: ({ output }) => {
    const { score, explanation } = scoreContinuationNarrativeEvolution(output.cycles ?? []);
    return Promise.resolve({ score, explanation });
  },
};
