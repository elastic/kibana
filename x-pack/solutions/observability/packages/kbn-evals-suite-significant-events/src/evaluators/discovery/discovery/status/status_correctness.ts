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
 * event was written at all: one for every active expected event, and no *confirmed* event for a
 * detection no expected event covers (a false alarm). An unconfirmed event, or one for a detection
 * the dataset expects as inactive, is the agent's to judge and scores the same written or not.
 * `grouping_correctness` and
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
    // An expected `inactive` event is a benign case discovery judges for itself: it is not owed,
    // and writing it is no mistake. Only the active ones are owed, and a detection that no expected
    // event covers at all is forbidden.
    const expectedRuleSets = expectedEvents
      .filter((event) => event.status !== 'inactive')
      .map(ruleSetOf);
    const optionalRules = new Set(
      expectedEvents
        .filter((event) => event.status === 'inactive')
        .flatMap((event) => [...ruleSetOf(event)])
    );
    const expectedUniverse = new Set(expectedRuleSets.flatMap((rules) => [...rules]));
    const forbiddenRules = new Set(
      (input?.detections ?? [])
        .map(ruleUuidOf)
        .filter((rule) => rule && !expectedUniverse.has(rule) && !optionalRules.has(rule))
    );

    const writtenSignals = (output?.significantEvents ?? []).flatMap(
      (event) => event.signals ?? []
    );
    const writtenRules = new Set(
      writtenSignals.map(({ metadata }) => ruleUuidOf(metadata ?? {})).filter(Boolean)
    );
    const confirmedRules = new Set(
      writtenSignals
        .filter(({ verdict }) => verdict === 'confirms')
        .map(({ metadata }) => ruleUuidOf(metadata ?? {}))
        .filter(Boolean)
    );

    const missingEvents = expectedRuleSets.filter(
      (rules) => ![...rules].some((rule) => writtenRules.has(rule))
    );
    const wronglyWritten = [...forbiddenRules].filter((rule) => confirmedRules.has(rule)).sort();

    const checks = expectedRuleSets.length + forbiddenRules.size;
    const failures = missingEvents.length + wronglyWritten.length;
    if (checks === 0) {
      return Promise.resolve({
        score: null,
        label: 'unavailable',
        explanation: 'No active expected or forbidden rules declared for this scenario',
      });
    }
    const issues = [
      ...missingEvents.map(
        (rules) => `no event written for expected rules [${[...rules].sort().join(', ')}]`
      ),
      ...(wronglyWritten.length > 0
        ? [
            `confirmed event written for rules no expected event covers [${wronglyWritten.join(
              ', '
            )}]`,
          ]
        : []),
    ];

    return Promise.resolve({
      score: (checks - failures) / checks,
      explanation:
        issues.length === 0
          ? 'An event was written for every expected event and none confirmed an uncovered detection'
          : issues.join('; '),
    });
  },
};
