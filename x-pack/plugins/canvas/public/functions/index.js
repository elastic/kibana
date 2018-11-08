/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { asset } from './asset';
import { filters } from './filters';
import { event } from './event';
import { reference } from './reference';
import { timelion } from './timelion';
import { exposeReference } from './exposeReference';
import { saveReference } from './saveReference';
import { navigateToDashboard } from './navigateToDashboard';

export const clientFunctions = [
  asset,
  filters,
  event,
  reference,
  saveReference,
  navigateToDashboard,
  timelion,
  exposeReference
];
