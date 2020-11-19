/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  renderFunctions as embeddableFunctions,
  renderFunctionFactories as embeddableFactories,
} from './embeddable';

import {
  renderFunctions as filterFunctions,
  renderFunctionFactories as filterFactories,
} from './filters';

import { renderFunctions as coreFunctions, renderFunctionFactories as coreFactories } from './core';

export const renderFunctions = [...coreFunctions, ...filterFunctions, ...embeddableFunctions];
export const renderFunctionFactories = [
  ...coreFactories,
  ...embeddableFactories,
  ...filterFactories,
];
