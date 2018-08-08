/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PhantomDriverFactory } from './driver_factory';

export { paths } from './paths';

export async function createDriverFactory(binaryPath) {
  return new PhantomDriverFactory(binaryPath);
}
