/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { coreMock } from '@kbn/core/public/mocks';
import { createMlStartDepsMock } from './ml_start_deps';

export const createCoreStartMock = () =>
  coreMock.createSetup({ pluginStartDeps: createMlStartDepsMock() });
