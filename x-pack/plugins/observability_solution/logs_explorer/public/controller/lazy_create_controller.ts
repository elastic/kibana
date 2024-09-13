/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CreateLogsExplorerControllerFactory } from './create_controller';

export const createLogsExplorerControllerLazyFactory: CreateLogsExplorerControllerFactory =
  (dependencies) => async (args) => {
    const { createLogsExplorerControllerFactory } = await import('./create_controller');

    return createLogsExplorerControllerFactory(dependencies)(args);
  };
