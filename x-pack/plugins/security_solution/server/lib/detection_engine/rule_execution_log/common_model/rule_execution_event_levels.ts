/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// -----------------------------------------------------------------------------
// Levels

export const RuleExecutionEventLevel = {
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
} as const;

export type RuleExecutionEventLevel = typeof RuleExecutionEventLevel[keyof typeof RuleExecutionEventLevel];

// -----------------------------------------------------------------------------
// Level severities

type LevelMappingTo<TValue> = Readonly<Record<RuleExecutionEventLevel, TValue>>;

const levelSeverityByLevel: LevelMappingTo<number> = Object.freeze({
  [RuleExecutionEventLevel.INFO]: 10,
  [RuleExecutionEventLevel.WARNING]: 20,
  [RuleExecutionEventLevel.ERROR]: 30,
});

export const getLevelSeverity = (level: RuleExecutionEventLevel): number => {
  return levelSeverityByLevel[level] ?? 0;
};
