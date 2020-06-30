/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ON_FAILURE_STATE_SCOPE, PROCESSOR_STATE_SCOPE } from './processors_reducer';

export enum DropSpecialLocations {
  top = 'TOP',
  bottom = 'BOTTOM',
}

export const PROCESSORS_BASE_SELECTOR = [PROCESSOR_STATE_SCOPE];
export const ON_FAILURE_BASE_SELECTOR = [ON_FAILURE_STATE_SCOPE];
