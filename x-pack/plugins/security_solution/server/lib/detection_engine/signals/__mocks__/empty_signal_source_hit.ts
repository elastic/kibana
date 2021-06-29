/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SignalSourceHit } from '../types';

/**
 * Simple empty Elasticsearch result for testing
 * @returns Empty Elasticsearch result for testing
 */
export const emptyEsResult = (): SignalSourceHit => ({
  _index: 'index',
  _id: '123',
});
