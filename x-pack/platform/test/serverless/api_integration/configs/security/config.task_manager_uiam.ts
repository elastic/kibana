/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path from 'path';
import { createTestConfig } from '../../config.base';

const sampleTaskPlugin = path.resolve(
  __dirname,
  '../../../../plugin_api_integration/plugins/sample_task_plugin'
);

/**
 * Task Manager running with UIAM API keys, which only serverless does. Serverless FTR brings up a
 * real UIAM service alongside Elasticsearch (`esServerlessOptions: { uiam: true }` in
 * `serverless/shared/config.base.ts`), so tasks can be granted and executed against real
 * credentials rather than mocks.
 *
 * Uses the `sample_task_plugin` fixture from `plugin_api_integration` to schedule tasks and read
 * back their state.
 */
export default createTestConfig({
  serverlessProject: 'security',
  testFiles: [require.resolve('../../test_suites/task_manager_uiam')],
  junit: {
    reportName: 'Serverless Task Manager UIAM API Key Integration Tests',
  },
  suiteTags: { exclude: ['skipSvlSec'] },

  kbnServerArgs: [
    // Use the UIAM key persisted on a task as the credential at execution time.
    '--xpack.task_manager.api_key_type=uiam',
    '--xpack.task_manager.grant_uiam_api_keys=true',
    // Poll frequently so scheduled tasks turn around quickly.
    '--xpack.task_manager.poll_interval=1000',
    `--plugin-path=${sampleTaskPlugin}`,
  ],
  enableFleetDockerRegistry: false,
});
