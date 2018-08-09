/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { spy } from 'sinon';

export function hFixture() {
  return {
    authenticated: spy(),
    continue: 'continue value',
    redirect: spy(),
    unstate: spy(),
  };
}
