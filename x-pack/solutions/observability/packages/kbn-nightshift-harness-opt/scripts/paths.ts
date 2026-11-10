/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Fs from 'fs';
import Os from 'os';
import Path from 'path';
import { REPO_ROOT } from '@kbn/repo-info';

export type Lane = 'incumbent' | 'candidate';

/** Where datasets, runs, the ledger and lineage live. Outside any worktree, so resets keep them. */
export const harnessPaths = () => {
  const root = process.env.NIGHTSHIFT_HARNESS_DIR ?? Path.join(Os.homedir(), '.nightshift-harness');
  Fs.mkdirSync(root, { recursive: true });
  return {
    root,
    datasetsDir: Path.join(root, 'datasets'),
    runsDir: Path.join(root, 'runs'),
    lineageDir: Path.join(root, 'lineage'),
    laneConfig: Path.join(root, 'lane.kibana.yml'),
  };
};

export interface LaneSettings {
  lane: Lane;
  worktree: string;
  /** dev_stack.sh index: ES on 9200 + 10i, Kibana on 5601 + 10i. */
  index: number;
  kibanaUrl: string;
  esUrl: string;
  username: string;
  password: string;
}

const laneAt = (lane: Lane, worktree: string, index: number): LaneSettings => ({
  lane,
  worktree,
  index,
  kibanaUrl: `http://localhost:${5601 + index * 10}`,
  esUrl: `http://localhost:${9200 + index * 10}`,
  username: 'elastic',
  password: 'changeme',
});

/**
 * The two lanes: each is a worktree with its own Elasticsearch and Kibana. Not one shared
 * Elasticsearch as in the ES|QL loop — Nightshift saves its one investigator's connectors per
 * space, and both lanes rewrite that connector per cutoff, so a shared cluster would race.
 */
export const defaultLanes = (): Record<Lane, LaneSettings> => ({
  incumbent: laneAt(
    'incumbent',
    process.env.NIGHTSHIFT_HARNESS_INCUMBENT ?? REPO_ROOT,
    Number(process.env.NIGHTSHIFT_HARNESS_INCUMBENT_INDEX ?? 1)
  ),
  candidate: laneAt(
    'candidate',
    process.env.NIGHTSHIFT_HARNESS_CANDIDATE ?? Path.join(Os.homedir(), 'kibana-nshopt-cand'),
    Number(process.env.NIGHTSHIFT_HARNESS_CANDIDATE_INDEX ?? 2)
  ),
});

export const DEV_STACK = Path.join(Os.homedir(), 'kibana-dev-tools/dev_stack.sh');

/** Shell command that restarts a lane's Kibana with the lane overrides loaded. */
export const restartCommandFor = (lane: LaneSettings): string => {
  const extra = `DEV_STACK_EXTRA_KIBANA_CONFIG=${JSON.stringify(harnessPaths().laneConfig)}`;
  const target = `${JSON.stringify(lane.worktree)} ${lane.index}`;
  return `${DEV_STACK} kibana stop ${target}; ${extra} ${DEV_STACK} kibana start ${target}`;
};

export const laneAuth = ({ username, password }: LaneSettings): string => `${username}:${password}`;
