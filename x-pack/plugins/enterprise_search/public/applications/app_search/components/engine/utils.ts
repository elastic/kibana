/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { generatePath } from 'react-router-dom';

import { EngineLogic } from './';

/**
 * Generate a path with engineName automatically filled from EngineLogic state
 */
export const generateEnginePath = (path: string, pathParams: object = {}) => {
  const { engineName } = EngineLogic.values;
  return generatePath(path, { engineName, ...pathParams });
};
