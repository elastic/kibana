/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EngineTypes } from '../components/engine/types';

export const defaultEngine = {
  id: 'e1',
  name: 'engine1',
  type: EngineTypes.default,
  language: null,
  result_fields: {},
};

export const indexedEngine = {
  id: 'e2',
  name: 'engine2',
  type: EngineTypes.indexed,
  language: null,
  result_fields: {},
};

export const engines = [defaultEngine, indexedEngine];
