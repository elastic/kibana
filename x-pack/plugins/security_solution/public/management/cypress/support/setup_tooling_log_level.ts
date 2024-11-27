/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createToolingLogger } from '../../../../common/endpoint/data_loaders/utils';

/**
 * Sets the default log level for `ToolingLog` instances crated via `createToolingLogger()`
 * based on the `TOOLING_LOG_LEVEL` env. variable in the cypress config
 * @param config
 */
export const setupToolingLogLevel = (config: Cypress.PluginConfigOptions) => {
  const log = createToolingLogger();
  const defaultToolingLogLevel = config.env.TOOLING_LOG_LEVEL;

  log.info(`
Cypress Configuration File: ${config.configFile}

'env.TOOLING_LOG_LEVEL' set to: ${defaultToolingLogLevel}

*** FYI: ***  To help with test failures, an environmental variable named 'TOOLING_LOG_LEVEL' can be set
              with a value of 'verbose' in order to capture more data in the logs. This environment
              property can be set either in the runtime environment (ex. local shell or buildkite) or
              directly in the Cypress configuration file \`env: {}\` section.

  `);

  if (defaultToolingLogLevel && defaultToolingLogLevel !== createToolingLogger.defaultLogLevel) {
    createToolingLogger.defaultLogLevel = defaultToolingLogLevel;
  }
};
