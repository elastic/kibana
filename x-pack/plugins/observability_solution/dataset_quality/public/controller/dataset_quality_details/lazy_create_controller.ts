/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CreateDatasetQualityDetailsControllerFactory } from './create_controller';

export const createDatasetQualityDetailsControllerLazyFactory: CreateDatasetQualityDetailsControllerFactory =
  (dependencies) => async (args) => {
    const { createDatasetQualityDetailsControllerFactory } = await import('./create_controller');

    return createDatasetQualityDetailsControllerFactory(dependencies)(args);
  };
