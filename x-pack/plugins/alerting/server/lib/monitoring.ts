/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import stats from 'stats-lite';
import { RuleMonitoring } from '../types';

export const getExecutionSuccessRatio = (ruleMonitoring: RuleMonitoring) => {
  const { history } = ruleMonitoring.execution;
  return history.filter(({ success }) => success).length / history.length;
};

export const getExecutionDurationPercentiles = (ruleMonitoring: RuleMonitoring) => {
  const durationSamples = ruleMonitoring.execution.history.reduce<number[]>((duration, history) => {
    if (typeof history.duration === 'number') {
      return [...duration, history.duration];
    }
    return duration;
  }, []);

  if (durationSamples.length) {
    return {
      p50: stats.percentile(durationSamples as number[], 0.5),
      p95: stats.percentile(durationSamples as number[], 0.95),
      p99: stats.percentile(durationSamples as number[], 0.99),
    };
  }

  return {};
};
