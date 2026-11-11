/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Fs from 'fs';
import Os from 'os';
import Path from 'path';

/** A worker's name, e.g. `w1`. */
export type Lane = string;

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
 * The worker pool: identical worktrees, each with its own Elasticsearch and headless Kibana. The
 * harness measures one variant at a time on all of them, spreading its telemetry cutoffs across
 * workers (one connector key per Kibana). \`NIGHTSHIFT_HARNESS_WORKERS\` overrides it as
 * \`name:index,…\` with worktrees at \`~/kibana-nshopt-<name>\`.
 */
export const defaultWorkers = (): LaneSettings[] =>
  (process.env.NIGHTSHIFT_HARNESS_WORKERS ?? 'w1:3,w2:5,w3:6,w4:7').split(',').map((entry) => {
    const [name, index] = entry.trim().split(':');
    return laneAt(name, Path.join(Os.homedir(), `kibana-nshopt-${name}`), Number(index));
  });

/**
 * Where the proposer edits. Never a worker: dev-mode Kibana restarts when its files change, so
 * editing a running worker would restart it mid-measurement.
 */
export const proposerWorktree = (): string =>
  process.env.NIGHTSHIFT_HARNESS_PROPOSER ?? Path.join(Os.homedir(), 'kibana-nshopt-cand');

export const DEV_STACK = Path.join(Os.homedir(), 'kibana-dev-tools/dev_stack.sh');

/** Shell command that restarts a lane's Kibana with the lane overrides loaded. */
export const restartCommandFor = (lane: LaneSettings): string => {
  // Headless: the rspack optimizer only serves the UI and holds ~8 GB per Kibana.
  const extra = `DEV_STACK_EXTRA_KIBANA_CONFIG=${JSON.stringify(
    harnessPaths().laneConfig
  )} DEV_STACK_KIBANA_ARGS=--no-optimizer`;
  const target = `${JSON.stringify(lane.worktree)} ${lane.index}`;
  return `${DEV_STACK} kibana stop ${target}; ${extra} ${DEV_STACK} kibana start ${target}`;
};

export const laneAuth = ({ username, password }: LaneSettings): string => `${username}:${password}`;
