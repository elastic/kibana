/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CanvasStartDeps } from '../plugin';
import { setupExpressionsContract, getExpressionsContract } from './expressions';
import { hooksFactory } from './hooks';

export const setupPluginsContracts = (startDeps: CanvasStartDeps) => {
  setupExpressionsContract(startDeps);
};

export const getPluginsContracts = () => ({
  expressions: getExpressionsContract(),
});

export const useExpressionsContract = hooksFactory(getExpressionsContract);
