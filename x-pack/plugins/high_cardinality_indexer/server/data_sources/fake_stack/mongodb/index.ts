/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createStartupEvents } from './lib/events/startup';
import type { GeneratorFunction } from '../../../types';
import type { Doc } from '../../../../common/types';

let firstRun = true;

export const kibanaAssets = `${__dirname}/assets/mongodb.ndjson`;

export const generateEvent: GeneratorFunction = (_config, _schedule, _index, timestamp) => {
  let startupEvents: Doc[] = [];
  if (firstRun) {
    firstRun = false;
    startupEvents = createStartupEvents(_schedule, timestamp);
  }
  return startupEvents;
};
