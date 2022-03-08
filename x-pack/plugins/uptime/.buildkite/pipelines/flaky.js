/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const { execSync } = require('child_process');

// List of steps generated dynamically from this jobs
const steps = [];
const pipeline = {
  env: {
    IGNORE_SHIP_CI_STATS_ERROR: 'true',
  },
  steps: steps,
};

// Default config
const defaultCount = 25;
const maxCount = 500;
const defaultConcurrency = 25;
const maxConcurrency = 50;
const initialJobs = 2;

const UUID = process.env.UUID;
const KIBANA_BUILD_ID = 'KIBANA_BUILD_ID';
const BUILD_UUID = 'build';

// Metada keys, should match the ones specified in pipeline step configuration
const E2E_COUNT = 'e2e/count';
const E2E_CONCURRENCY = 'e2e/concurrent';
const E2E_GREP = 'e2e/grep';
const E2E_ARTIFACTS_ID = 'e2e/build-id';

const env = getEnvFromMetadata();

const totalJobs = env[E2E_COUNT] + initialJobs;

if (totalJobs > maxCount) {
  console.error('+++ Too many steps');
  console.error(
    `Buildkite builds can only contain 500 steps in total. Found ${totalJobs} in total. Make sure your test runs are less than ${
      maxCount - initialJobs
    }`
  );
  process.exit(1);
}

// If build id is provided, export it so build step is skipped
pipeline.env[KIBANA_BUILD_ID] = env[E2E_ARTIFACTS_ID];

// Build job first
steps.push(getBuildJob());
steps.push(getGroupRunnerJob(env));

console.log(JSON.stringify(pipeline, null, 2));

/***
 * Utils
 */

function getBuildJob() {
  return {
    command: '.buildkite/scripts/steps/build_kibana.sh',
    label: 'Build Kibana Distribution and Plugins',
    agents: { queue: 'c2-8' },
    key: BUILD_UUID,
    if: `build.env('${KIBANA_BUILD_ID}') == null || build.env('${KIBANA_BUILD_ID}') == ''`,
  };
}

function getGroupRunnerJob(env) {
  return {
    command: `${
      env[E2E_GREP] ? `GREP="${env[E2E_GREP]}" ` : ''
    }.buildkite/scripts/steps/functional/uptime.sh`,
    label: `Uptime E2E - Synthetics runner`,
    agents: { queue: 'n2-4' },
    depends_on: BUILD_UUID,
    parallelism: env[E2E_COUNT],
    concurrency: env[E2E_CONCURRENCY],
    concurrency_group: UUID,
    concurrency_method: 'eager',
  };
}

function getEnvFromMetadata() {
  const env = {};

  env[E2E_COUNT] = getIntValue(E2E_COUNT, defaultCount);
  env[E2E_CONCURRENCY] = getIntValue(E2E_CONCURRENCY, defaultConcurrency);
  env[E2E_GREP] = getStringValue(E2E_GREP);
  env[E2E_ARTIFACTS_ID] = getStringValue(E2E_ARTIFACTS_ID);

  env[E2E_CONCURRENCY] =
    env[E2E_CONCURRENCY] > maxConcurrency ? maxConcurrency : env[E2E_CONCURRENCY];

  return env;
}

function getIntValue(key, defaultValue) {
  let value = defaultValue;
  const cli = execSync(`buildkite-agent meta-data get '${key}' --default ${defaultValue} `)
    .toString()
    .trim();

  try {
    value = parseInt(cli, 10);
  } finally {
    return value;
  }
}

function getStringValue(key) {
  return execSync(`buildkite-agent meta-data get '${key}' --default ''`).toString().trim();
}
