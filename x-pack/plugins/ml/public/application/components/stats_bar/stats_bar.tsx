/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { Stat, StatsBarStat } from './stat';

interface Stats {
  total: StatsBarStat;
  failed: StatsBarStat;
}
export interface JobStatsBarStats extends Stats {
  activeNodes: StatsBarStat;
  open: StatsBarStat;
  closed: StatsBarStat;
  activeDatafeeds: StatsBarStat;
}

export interface AnalyticStatsBarStats extends Stats {
  started: StatsBarStat;
  stopped: StatsBarStat;
}

export type StatsBarStats = JobStatsBarStats | AnalyticStatsBarStats;
type StatsKey = keyof StatsBarStats;

interface StatsBarProps {
  stats: StatsBarStats;
  dataTestSub: string;
}

export const StatsBar: FC<StatsBarProps> = ({ stats, dataTestSub }) => {
  const statsList = Object.keys(stats).map((k) => stats[k as StatsKey]);
  return (
    <div className="mlStatsBar" data-test-subj={dataTestSub}>
      {statsList
        .filter((s: StatsBarStat) => s.show)
        .map((s: StatsBarStat) => (
          <Stat key={s.label} stat={s} />
        ))}
    </div>
  );
};
