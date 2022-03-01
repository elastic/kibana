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
const concurrency = 25;
const defaultCount = 50;
const initialJobs = 2;
const BUILD_UUID = 'build';
const UUID = process.env.UUID;

// Metada keys, should match the ones specified in pipeline step configuration
const E2E_COUNT = 'e2e/count';
const E2E_GREP = 'e2e/grep';

const env = getEnvFromMetadata();

const totalJobs = env[E2E_COUNT] + initialJobs;

if (totalJobs > 500) {
  console.error('+++ Too many tests');
  console.error(
    `Buildkite builds can only contain 500 steps in total. Found ${totalJobs} in total. Make sure your test runs are less than ${
      500 - initialJobs
    }`
  );
  process.exit(1);
}

// Build job first
steps.push(getBuildJob());
steps.push(getRunnerJob(env));

console.log(JSON.stringify(pipeline, null, 2));

function getBuildJob() {
  return {
    command: '.buildkite/scripts/steps/build_kibana.sh',
    label: 'Build Kibana Distribution and Plugins',
    agents: { queue: 'c2-8' },
    key: BUILD_UUID,
    if: "build.env('BUILD_ID_FOR_ARTIFACTS') == null || build.env('BUILD_ID_FOR_ARTIFACTS') == ''",
  };
}

function getRunnerJob(env) {
  return {
    command: `${
      env[E2E_GREP] ? `GREP="${env[E2E_GREP]}" ` : ''
    }.buildkite/scripts/steps/functional/uptime.sh`,
    label: `Uptime E2E - Synthetics runner`,
    agents: { queue: 'n2-4' },
    depends_on: BUILD_UUID,
    parallelism: env[E2E_COUNT],
    concurrency: concurrency,
    concurrency_group: UUID,
    concurrency_method: 'eager',
  };
}

function getEnvFromMetadata() {
  const env = {};

  env[E2E_COUNT] = execSync(
    `buildkite-agent meta-data get '${E2E_COUNT}' --default ${defaultCount}`
  )
    .toString()
    .trim();
  env[E2E_GREP] = execSync(`buildkite-agent meta-data get '${E2E_GREP}'`).toString().trim();

  return env;
}
