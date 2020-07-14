/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CanvasServiceFactory } from '.';
import { ExpressionsService } from '../../../../../src/plugins/expressions/common';

export const expressionsServiceFactory: CanvasServiceFactory<ExpressionsService> = async (
  coreSetup,
  coreStart,
  setupPlugins,
  startPlugins
) => {
  await setupPlugins.expressions.__LEGACY.loadLegacyServerFunctionWrappers();

  return setupPlugins.expressions.fork();
};
