/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DiscoveryEvaluator } from '../../types';

const ruleUuidOf = (detection: { rule_uuid?: string; metadata?: { rule_uuid?: string } }): string =>
  detection.rule_uuid ?? detection.metadata?.rule_uuid ?? '';

/**
 * Status follows from the verdicts the agent stores, so the decision left to grade is whether an
 * event was written at all: one for every expected event, and none for a detection no expected
 * event covers (a false alarm, a benign change). `grouping_correctness` and
 * `confirmation_alignment` ignore events outside the expected rules, so this is where those are
 * caught.
 */
export const statusCorrectnessEvaluator: DiscoveryEvaluator = {
  name: 'status_correctness',
  kind: 'CODE',
  direction: 'maximize',
  evaluate: ({ input, output, expected }) => {
    const expectedEvents = expected?.expected_significant_events ?? [];
    if (expectedEvents.length === 0) {
      return Promise.resolve({
        score: null,
        label: 'unavailable',
        explanation: 'No expected_significant_events declared for this scenario',
      });
    }

    const ruleSetOf = (event: (typeof expectedEvents)[number]) =>
      new Set(
        (event.signals ?? []).map(({ metadata }) => ruleUuidOf(metadata ?? {})).filter(Boolean)
      );
    // An expected `inactive` event is a benign case the agent must not write, so only the active
    // ones are owed; the rules of the inactive ones stay outside the universe and are forbidden.
    const expectedRuleSets = expectedEvents
      .filter((event) => event.status !== 'inactive')
      .map(ruleSetOf);
    const expectedUniverse = new Set(expectedRuleSets.flatMap((rules) => [...rules]));
    const forbiddenRules = new Set(
      (input?.detections ?? [])
        .map(ruleUuidOf)
        .filter((rule) => rule && !expectedUniverse.has(rule))
    );

    const writtenRules = new Set(
      (output?.significantEvents ?? []).flatMap((event) =>
        (event.signals ?? []).map(({ metadata }) => ruleUuidOf(metadata ?? {})).filter(Boolean)
      )
    );

    const missingEvents = expectedRuleSets.filter(
      (rules) => ![...rules].some((rule) => writtenRules.has(rule))
    );
    const wronglyWritten = [...forbiddenRules].filter((rule) => writtenRules.has(rule)).sort();

    const checks = expectedRuleSets.length + forbiddenRules.size;
    const failures = missingEvents.length + wronglyWritten.length;
    const issues = [
      ...missingEvents.map(
        (rules) => `no event written for expected rules [${[...rules].sort().join(', ')}]`
      ),
      ...(wronglyWritten.length > 0
        ? [`event written for rules no expected event covers [${wronglyWritten.join(', ')}]`]
        : []),
    ];

    return Promise.resolve({
      score: (checks - failures) / checks,
      explanation:
        issues.length === 0
          ? 'An event was written for every expected event and for no uncovered detection'
          : issues.join('; '),
    });
  },
};
