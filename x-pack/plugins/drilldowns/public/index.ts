/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DrilldownsPlugin } from './plugin';

export {
  SetupContract as DrilldownsSetup,
  SetupDependencies as DrilldownsSetupDependencies,
  StartContract as DrilldownsStart,
  StartDependencies as DrilldownsStartDependencies,
} from './plugin';

export function plugin() {
  return new DrilldownsPlugin();
}
