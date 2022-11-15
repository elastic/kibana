/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ScreenshottingCoreSetup } from '../plugin';
import { registerRenderExpressionRaw } from './routes/render_expression_raw';
import { registerRenderExpression } from './routes/render_expression';

export interface RegisterRoutesParams {
  core: ScreenshottingCoreSetup;
}

export const registerRoutes = ({ core }: RegisterRoutesParams) => {
  const router = core.http.createRouter();

  registerRenderExpressionRaw({ core, router });
  registerRenderExpression({ core, router });
};
