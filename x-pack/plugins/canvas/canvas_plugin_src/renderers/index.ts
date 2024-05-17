/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  renderFunctionFactories as embeddableFactories,
  renderFunctions as embeddableFunctions,
} from './embeddable';

import {
  renderFunctionFactories as filterFactories,
  renderFunctions as filterFunctions,
} from './filters';

import {
  renderFunctionFactories as externalFactories,
  renderFunctions as externalFunctions,
} from './external';

import { renderFunctionFactories as coreFactories, renderFunctions as coreFunctions } from './core';

export const renderFunctions = [
  ...coreFunctions,
  ...filterFunctions,
  ...embeddableFunctions,
  ...externalFunctions,
];

export const renderFunctionFactories = [
  ...coreFactories,
  ...embeddableFactories,
  ...filterFactories,
  ...externalFactories,
];
