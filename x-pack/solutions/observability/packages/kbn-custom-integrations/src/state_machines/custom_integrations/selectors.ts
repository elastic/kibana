/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CustomIntegrationsState } from './state_machine';

export const createIsInitializedSelector = (state: CustomIntegrationsState) =>
  state && state.matches({ create: 'initialized' });
