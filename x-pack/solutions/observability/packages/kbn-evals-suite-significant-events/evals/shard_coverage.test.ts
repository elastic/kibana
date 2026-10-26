/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Fs from 'fs';
import Path from 'path';
import { REPO_ROOT } from '@kbn/repo-info';

/**
 * CI splits this suite across Buildkite steps, each running the spec files its shard lists in
 * `.buildkite/pipelines/evals/evals.suites.json`. That list and the specs on disk are one contract:
 * a spec nobody claims never runs, and a spec two shards claim runs twice on every model. Adding or
 * moving a spec means updating the shards.
 */

interface EvalsSuiteShard {
  id: string;
  specFiles: string[];
}

const SUITE_ID = 'significant-events';
const SUITE_ROOT = Path.resolve(__dirname, '..');
const SUITES_CONFIG = Path.resolve(REPO_ROOT, '.buildkite/pipelines/evals/evals.suites.json');

// Config paths are posix; `Path.relative` follows the platform.
const toPosix = (value: string) => value.split(Path.sep).join('/');

const collectSpecFiles = (dir: string): string[] =>
  Fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = Path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return collectSpecFiles(entryPath);
    }
    return entry.name.endsWith('.spec.ts') ? [toPosix(Path.relative(SUITE_ROOT, entryPath))] : [];
  });

const specFilesOnDisk = collectSpecFiles(__dirname);

const shards: EvalsSuiteShard[] =
  (
    JSON.parse(Fs.readFileSync(SUITES_CONFIG, 'utf-8')) as {
      suites: Array<{ id: string; shards?: EvalsSuiteShard[] }>;
    }
  ).suites.find((suite) => suite.id === SUITE_ID)?.shards ?? [];

const declarations = shards.flatMap(({ id, specFiles = [] }) =>
  specFiles.map((specFile) => ({ shardId: id, specFile }))
);

describe('significant-events shard coverage', () => {
  it('has both sides of the contract to compare', () => {
    // The tests below pass vacuously if either side comes back empty.
    expect(shards.length).toBeGreaterThan(0);
    expect(specFilesOnDisk.length).toBeGreaterThan(0);
  });

  it('assigns every spec file on disk to exactly one shard', () => {
    const problems = specFilesOnDisk
      .map((specFile) => ({
        specFile,
        shardIds: declarations
          .filter((entry) => entry.specFile === specFile)
          .map(({ shardId }) => shardId),
      }))
      .filter(({ shardIds }) => shardIds.length !== 1)
      .map(({ specFile, shardIds }) =>
        shardIds.length === 0
          ? `"${specFile}" is in no shard, so nothing runs it`
          : `"${specFile}" is in ${
              shardIds.length
            } shards, so it runs more than once: [${shardIds.join(', ')}]`
      );

    expect(problems).toEqual([]);
  });

  it('points every declared spec file at one that exists', () => {
    const problems = declarations
      .filter(({ specFile }) => !specFilesOnDisk.includes(specFile))
      .map(
        ({ shardId, specFile }) => `shard "${shardId}" lists "${specFile}", which does not exist`
      );

    expect(problems).toEqual([]);
  });
});
